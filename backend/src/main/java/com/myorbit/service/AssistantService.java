package com.myorbit.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.myorbit.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AssistantService {
  private static final Logger log = LoggerFactory.getLogger(AssistantService.class);
  private final AppProperties properties;
  private final RecordService records;
  private final ObjectMapper mapper;
  private final RestClient http;

  public AssistantService(AppProperties properties, RecordService records, ObjectMapper mapper) {
    this.properties = properties;
    this.records = records;
    this.mapper = mapper;
    HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
    JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
    factory.setReadTimeout(Duration.ofSeconds(25));
    this.http = RestClient.builder().requestFactory(factory).build();
  }

  public Map<String, Object> reply(String userId, String message) {
    Map<String, Object> fallback = Map.of("source", "rules");
    if (!properties.llmConfigured() || message == null || message.isBlank()) return fallback;
    List<Map<String, Object>> skills = records.list(userId, RecordService.SKILLS);
    List<Map<String, Object>> tasks = records.list(userId, RecordService.TASKS);
    if (skills.isEmpty() && tasks.isEmpty()) return fallback;
    try {
      String raw = http.post()
          .uri(properties.getLlmUrl())
          .header("Authorization", "Bearer " + properties.getLlmKey())
          .contentType(MediaType.APPLICATION_JSON)
          .body(payload(message.trim(), context(userId, skills, tasks)))
          .retrieve()
          .body(String.class);
      return parse(raw);
    } catch (Exception ex) {
      log.warn("AI API did not answer: {}", ex.getMessage());
      return fallback;
    }
  }

  private Map<String, Object> payload(String message, String context) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("model", properties.getLlmModel());
    body.put("temperature", 0.3);
    body.put("messages", List.of(
        Map.of("role", "system", "content", """
            You are the planner inside MyOrbit. Use only the saved data included in the user message.
            Never claim a task, skill, hour, streak, or fitness log is complete unless that saved status says completed.
            Do not diagnose illness or prescribe treatment. Keep exercise at or below the user's saved exercise goal and never above 90 minutes.
            Reply with JSON only, no markdown:
            {"reply":"...","suggestions":[{"title":"...","detail":"...","category":"Learning","priority":"medium","estimateMin":40}]}
            """),
        Map.of("role", "user", "content", message + "\n\nSaved data:\n" + context)
    ));
    return body;
  }

  private String context(String userId, List<Map<String, Object>> skills, List<Map<String, Object>> tasks) {
    Map<String, Object> profile = records.readProfile(userId);
    StringBuilder text = new StringBuilder();
    if (profile != null) {
      text.append("Name: ").append(RecordService.text(profile.get("name"))).append('\n');
      text.append("Career target: ").append(RecordService.text(profile.get("careerTarget"))).append('\n');
      text.append("Study hours per day: ").append(profile.get("studyHoursPerDay")).append('\n');
      Object fitness = profile.get("fitness");
      if (fitness instanceof Map<?, ?> map) {
        text.append("Exercise goal minutes: ").append(map.get("exerciseMinutes")).append('\n');
      }
    }
    text.append("Skills:\n");
    skills.stream().limit(30).forEach(skill -> text
        .append("- ")
        .append(RecordService.text(skill.get("name")))
        .append(" | current ").append(RecordService.text(skill.get("currentLevel")))
        .append(" | target ").append(RecordService.text(skill.get("targetLevel")))
        .append(" | priority ").append(RecordService.text(skill.get("priority")))
        .append('\n'));
    text.append("Tasks:\n");
    tasks.stream().limit(40).forEach(task -> text
        .append("- ")
        .append(RecordService.text(task.get("title")))
        .append(" | status ").append(RecordService.text(task.get("status")))
        .append(" | due ").append(RecordService.text(task.get("dueDate")))
        .append('\n'));
    return text.toString();
  }

  private Map<String, Object> parse(String raw) throws Exception {
    JsonNode root = mapper.readTree(raw == null ? "{}" : raw);
    String content = root.path("choices").path(0).path("message").path("content").asText("").trim();
    if (content.startsWith("```")) {
      content = content.replaceFirst("^```json", "").replaceFirst("^```", "");
      int end = content.lastIndexOf("```");
      if (end >= 0) content = content.substring(0, end);
      content = content.trim();
    }
    JsonNode parsed;
    try {
      parsed = mapper.readTree(content);
    } catch (Exception ex) {
      parsed = mapper.createObjectNode().put("reply", content);
    }
    String reply = parsed.path("reply").asText(content).trim();
    if (reply.isBlank()) return Map.of("source", "rules");
    if (reply.length() > 6000) reply = reply.substring(0, 6000);
    List<Map<String, Object>> suggestions = new ArrayList<>();
    if (parsed.path("suggestions").isArray()) {
      for (JsonNode item : parsed.path("suggestions")) {
        if (suggestions.size() >= 8) break;
        String title = item.path("title").asText("").trim();
        if (title.isBlank() || title.length() > 140) continue;
        Map<String, Object> suggestion = new LinkedHashMap<>();
        suggestion.put("title", title);
        suggestion.put("detail", clip(item.path("detail").asText(""), 400));
        suggestion.put("category", clip(item.path("category").asText("Learning"), 40));
        String priority = item.path("priority").asText("medium").toLowerCase();
        if (!List.of("low", "medium", "high", "critical").contains(priority)) priority = "medium";
        suggestion.put("priority", priority);
        suggestion.put("estimateMin", Math.min(180, Math.max(15, item.path("estimateMin").asInt(40))));
        suggestions.add(suggestion);
      }
    }
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("source", "llm");
    result.put("reply", reply);
    result.put("suggestions", suggestions);
    return result;
  }

  private String clip(String value, int max) {
    String trimmed = value == null ? "" : value.trim();
    return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
  }
}
