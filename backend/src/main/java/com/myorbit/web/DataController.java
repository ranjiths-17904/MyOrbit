package com.myorbit.web;

import com.myorbit.security.CurrentUser;
import com.myorbit.service.AssistantService;
import com.myorbit.service.NotifyService;
import com.myorbit.service.PlannerService;
import com.myorbit.service.ProfileService;
import com.myorbit.service.RecordService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class DataController {
  private final RecordService records;
  private final ProfileService profiles;
  private final PlannerService planner;
  private final AssistantService assistant;
  private final NotifyService notify;

  public DataController(RecordService records, ProfileService profiles, PlannerService planner, AssistantService assistant, NotifyService notify) {
    this.records = records;
    this.profiles = profiles;
    this.planner = planner;
    this.assistant = assistant;
    this.notify = notify;
  }

  @GetMapping("/profile")
  public Map<String, Object> profile() {
    return profiles.get(CurrentUser.id());
  }

  @PutMapping("/profile")
  public Map<String, Object> saveProfile(@RequestBody Map<String, Object> body) {
    return profiles.save(CurrentUser.id(), body);
  }

  @GetMapping("/skills")
  public List<Map<String, Object>> skills() {
    return records.list(CurrentUser.id(), RecordService.SKILLS);
  }

  @PostMapping("/skills")
  public Map<String, Object> createSkill(@RequestBody Map<String, Object> body) {
    require(body, "name");
    Map<String, Object> saved = records.create(CurrentUser.id(), RecordService.SKILLS, body);
    records.syncResources(CurrentUser.id(), RecordService.text(saved.get("id")), RecordService.text(saved.get("name")), saved.get("resources"));
    return saved;
  }

  @PutMapping("/skills/{id}")
  public Map<String, Object> updateSkill(@PathVariable String id, @RequestBody Map<String, Object> body) {
    require(body, "name");
    body.put("id", id);
    Map<String, Object> saved = records.replace(CurrentUser.id(), RecordService.SKILLS, id, body);
    records.syncResources(CurrentUser.id(), id, RecordService.text(saved.get("name")), saved.get("resources"));
    return saved;
  }

  @DeleteMapping("/skills/{id}")
  public void deleteSkill(@PathVariable String id) {
    records.delete(CurrentUser.id(), RecordService.SKILLS, id);
    records.deleteResources(CurrentUser.id(), id);
  }

  @GetMapping("/tasks")
  public List<Map<String, Object>> tasks() {
    return records.list(CurrentUser.id(), RecordService.TASKS);
  }

  @PostMapping("/tasks")
  public Map<String, Object> createTask(@RequestBody Map<String, Object> body) {
    require(body, "title");
    return records.create(CurrentUser.id(), RecordService.TASKS, body);
  }

  @PutMapping("/tasks/{id}")
  public Map<String, Object> updateTask(@PathVariable String id, @RequestBody Map<String, Object> body) {
    require(body, "title");
    body.put("id", id);
    return records.replace(CurrentUser.id(), RecordService.TASKS, id, body);
  }

  @DeleteMapping("/tasks/{id}")
  public void deleteTask(@PathVariable String id) {
    records.delete(CurrentUser.id(), RecordService.TASKS, id);
  }

  @GetMapping("/notes")
  public List<Map<String, Object>> notes() {
    return records.list(CurrentUser.id(), RecordService.NOTES);
  }

  @PostMapping("/notes")
  public Map<String, Object> createNote(@RequestBody Map<String, Object> body) {
    if (RecordService.text(body.get("title")).isBlank() && RecordService.text(body.get("body")).isBlank()) {
      throw new ApiException(400, "Write a title or a note.");
    }
    return records.create(CurrentUser.id(), RecordService.NOTES, body);
  }

  @PutMapping("/notes/{id}")
  public Map<String, Object> updateNote(@PathVariable String id, @RequestBody Map<String, Object> body) {
    if (RecordService.text(body.get("title")).isBlank() && RecordService.text(body.get("body")).isBlank()) {
      throw new ApiException(400, "Write a title or a note.");
    }
    body.put("id", id);
    return records.replace(CurrentUser.id(), RecordService.NOTES, id, body);
  }

  @DeleteMapping("/notes/{id}")
  public void deleteNote(@PathVariable String id) {
    records.delete(CurrentUser.id(), RecordService.NOTES, id);
  }

  @GetMapping("/blocks")
  public List<Map<String, Object>> blocks() {
    return records.list(CurrentUser.id(), RecordService.SCHEDULES);
  }

  @PostMapping("/blocks")
  public Map<String, Object> createBlock(@RequestBody Map<String, Object> body) {
    require(body, "title");
    planner.assertBlockFits(CurrentUser.id(), body);
    return records.create(CurrentUser.id(), RecordService.SCHEDULES, body);
  }

  @PutMapping("/blocks/{id}")
  public Map<String, Object> updateBlock(@PathVariable String id, @RequestBody Map<String, Object> body) {
    require(body, "title");
    body.put("id", id);
    planner.assertBlockFits(CurrentUser.id(), body);
    return records.replace(CurrentUser.id(), RecordService.SCHEDULES, id, body);
  }

  @DeleteMapping("/blocks/{id}")
  public void deleteBlock(@PathVariable String id) {
    records.delete(CurrentUser.id(), RecordService.SCHEDULES, id);
  }

  @GetMapping("/fitness")
  public List<Map<String, Object>> fitness() {
    return records.list(CurrentUser.id(), RecordService.FITNESS);
  }

  @PostMapping("/fitness")
  public Map<String, Object> saveFitness(@RequestBody Map<String, Object> body) {
    return records.upsertByDate(CurrentUser.id(), RecordService.FITNESS, body);
  }

  @GetMapping("/routines")
  public List<Map<String, Object>> routines() {
    return records.list(CurrentUser.id(), RecordService.HABITS);
  }

  @PostMapping("/routines")
  public Map<String, Object> createRoutine(@RequestBody Map<String, Object> body) {
    require(body, "name");
    return records.create(CurrentUser.id(), RecordService.HABITS, body);
  }

  @DeleteMapping("/routines/{id}")
  public void deleteRoutine(@PathVariable String id) {
    records.delete(CurrentUser.id(), RecordService.HABITS, id);
  }

  @GetMapping("/mobile")
  public List<Map<String, Object>> mobile() {
    return records.list(CurrentUser.id(), RecordService.MOBILE);
  }

  @PostMapping("/mobile")
  public Map<String, Object> saveMobile(@RequestBody Map<String, Object> body) {
    return records.upsertByDate(CurrentUser.id(), RecordService.MOBILE, body);
  }

  @GetMapping("/notifications")
  public List<Map<String, Object>> notifications() {
    return records.list(CurrentUser.id(), RecordService.NOTIFICATIONS).stream()
        .sorted(Comparator.comparing((Map<String, Object> item) -> RecordService.text(item.get("createdAt"))).reversed())
        .limit(40)
        .toList();
  }

  @PostMapping("/notifications")
  public Map<String, Object> createNotification(@RequestBody Map<String, Object> body) {
    require(body, "title");
    return records.create(CurrentUser.id(), RecordService.NOTIFICATIONS, body);
  }

  @PostMapping("/notifications/read")
  public Map<String, Object> readNotifications() {
    for (Map<String, Object> item : records.list(CurrentUser.id(), RecordService.NOTIFICATIONS)) {
      item.put("read", true);
      records.save(CurrentUser.id(), RecordService.NOTIFICATIONS, item);
    }
    return Map.of("ok", true);
  }

  @PostMapping("/notifications/test")
  public Map<String, Object> testNotification() {
    notify.sendTest(CurrentUser.id());
    return Map.of("ok", true);
  }

  @GetMapping("/scheduler/proposal")
  public Map<String, Object> proposal() {
    Map<String, Object> proposal = planner.proposal(CurrentUser.id());
    return proposal == null ? new LinkedHashMap<>() : proposal;
  }

  @PostMapping("/scheduler/generate")
  public Map<String, Object> generate(@RequestBody Map<String, Object> body) {
    return planner.generate(CurrentUser.id(), body);
  }

  @PostMapping("/scheduler/approve")
  public Map<String, Object> approve(@RequestBody Map<String, Object> body) {
    return planner.approve(CurrentUser.id(), body);
  }

  @PostMapping("/assistant")
  public Map<String, Object> assistant(@Valid @RequestBody AuthRequests.MessageRequest request) {
    return assistant.reply(CurrentUser.id(), request.message());
  }

  @PostMapping("/vault/import")
  public Map<String, Object> importVault(@RequestBody Map<String, Object> body) {
    profiles.importVault(CurrentUser.id(), body);
    return Map.of("ok", true);
  }

  private void require(Map<String, Object> body, String field) {
    if (RecordService.text(body.get(field)).isBlank()) {
      throw new ApiException(400, field + " is required.");
    }
  }
}
