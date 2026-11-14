package com.myorbit.service;

import com.myorbit.model.UserAccount;
import com.myorbit.web.ApiException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ProfileService {
  private final RecordService records;
  private final AuthService auth;

  public ProfileService(RecordService records, AuthService auth) {
    this.records = records;
    this.auth = auth;
  }

  public Map<String, Object> get(String userId) {
    UserAccount user = auth.require(userId);
    Map<String, Object> profile = records.readProfile(userId);
    if (profile == null) throw new ApiException(404, "Profile was not found.");
    profile.put("email", user.getEmail());
    if (RecordService.text(profile.get("name")).isBlank()) profile.put("name", user.getName());
    return profile;
  }

  public Map<String, Object> save(String userId, Map<String, Object> incoming) {
    UserAccount user = auth.require(userId);
    Map<String, Object> current = records.readProfile(userId);
    if (current == null) current = new LinkedHashMap<>();
    Map<String, Object> next = new LinkedHashMap<>(current);
    incoming.forEach((key, value) -> {
      if ("email".equals(key) || "id".equals(key) || "userId".equals(key)) return;
      next.put(key, value);
    });
    next.put("email", user.getEmail());
    List<Map<String, Object>> reports = unionById(maps(current.get("reports")), maps(incoming.get("reports")));
    for (Map<String, Object> report : reports) {
      if (RecordService.text(report.get("id")).isBlank()) report.put("id", java.util.UUID.randomUUID().toString());
    }
    next.put("reports", reports);
    next.put("lastReview", preferReview(current.get("lastReview"), incoming.get("lastReview")));
    if (RecordService.text(next.get("name")).isBlank()) next.put("name", user.getName());
    Map<String, Object> saved = records.writeProfile(userId, next);
    records.replaceOwned(userId, RecordService.GOALS, saved.get("goals"));
    records.replaceOwned(userId, RecordService.REPORTS, saved.get("reports"));
    saved.put("email", user.getEmail());
    return saved;
  }

  public void importVault(String userId, Map<String, Object> body) {
    records.replaceOwned(userId, RecordService.SKILLS, body.get("skills"));
    records.replaceOwned(userId, RecordService.TASKS, body.get("tasks"));
    records.replaceOwned(userId, RecordService.NOTES, body.get("notes"));
    records.replaceOwned(userId, RecordService.SCHEDULES, body.get("blocks"));
    importDated(userId, RecordService.FITNESS, body.get("fitness"));
    records.replaceOwned(userId, RecordService.HABITS, body.get("routines"));
    importDated(userId, RecordService.MOBILE, body.get("mobile"));
    for (Map<String, Object> skill : RecordService.maps(body.get("skills"))) {
      records.syncResources(userId, RecordService.text(skill.get("id")), RecordService.text(skill.get("name")), skill.get("resources"));
    }
    records.replaceOwned(userId, RecordService.NOTIFICATIONS, body.get("notifications"));
    Object proposal = body.get("proposal");
    if (proposal instanceof Map<?, ?> map && !RecordService.maps(map.get("blocks")).isEmpty()) {
      Map<String, Object> copy = new LinkedHashMap<>();
      map.forEach((key, value) -> copy.put(String.valueOf(key), value));
      records.writeProposal(userId, copy);
    } else {
      records.clearProposal(userId);
    }
    Map<String, Object> existing = records.readProfile(userId);
    if (existing != null) {
      existing.put("reports", List.of());
      existing.put("lastReview", null);
      records.writeProfile(userId, existing);
    }
    Object rawProfile = body.get("profile");
    Map<String, Object> profile = rawProfile instanceof Map<?, ?> map ? copy(map) : new LinkedHashMap<>();
    if (!body.containsKey("reports") && profile.get("reports") != null) {
      profile.put("reports", profile.get("reports"));
    } else {
      profile.put("reports", body.get("reports") instanceof List<?> ? body.get("reports") : profile.getOrDefault("reports", List.of()));
    }
    if (body.get("lastReview") != null) profile.put("lastReview", body.get("lastReview"));
    if (profile.get("goals") == null && body.get("goals") instanceof List<?>) profile.put("goals", body.get("goals"));
    save(userId, profile);
  }

  private void importDated(String userId, String collection, Object raw) {
    records.deleteAll(userId, collection);
    for (Map<String, Object> item : RecordService.maps(raw)) records.upsertByDate(userId, collection, item);
  }

  private Object preferReview(Object server, Object client) {
    if (!(client instanceof Map<?, ?>)) return server;
    if (!(server instanceof Map<?, ?>)) return client;
    String serverKey = RecordService.text(((Map<?, ?>) server).get("weekStart"));
    String clientKey = RecordService.text(((Map<?, ?>) client).get("weekStart"));
    if (clientKey.compareTo(serverKey) >= 0) return client;
    return server;
  }

  private List<Map<String, Object>> unionById(List<Map<String, Object>> server, List<Map<String, Object>> client) {
    Map<String, Map<String, Object>> merged = new LinkedHashMap<>();
    for (Map<String, Object> item : server) merged.put(idOf(item), item);
    for (Map<String, Object> item : client) merged.put(idOf(item), item);
    return new ArrayList<>(merged.values());
  }

  private String idOf(Map<String, Object> item) {
    String id = RecordService.text(item.get("id"));
    if (!id.isBlank()) return id;
    String created = RecordService.text(item.get("savedAt"));
    return created.isBlank() ? String.valueOf(item.hashCode()) : created;
  }

  private List<Map<String, Object>> maps(Object raw) {
    return RecordService.maps(raw);
  }

  private Map<String, Object> copy(Map<?, ?> raw) {
    Map<String, Object> copy = new LinkedHashMap<>();
    raw.forEach((key, value) -> copy.put(String.valueOf(key), value));
    return copy;
  }
}
