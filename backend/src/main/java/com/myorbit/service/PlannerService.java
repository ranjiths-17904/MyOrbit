package com.myorbit.service;

import com.myorbit.web.ApiException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class PlannerService {
  private final RecordService records;
  private final ProfileService profiles;
  private final NotifyService notify;

  public PlannerService(RecordService records, ProfileService profiles, NotifyService notify) {
    this.records = records;
    this.profiles = profiles;
    this.notify = notify;
  }

  public Map<String, Object> proposal(String userId) {
    Map<String, Object> saved = records.readProposal(userId);
    if (saved == null || RecordService.maps(saved.get("blocks")).isEmpty()) return null;
    return saved;
  }

  public Map<String, Object> generate(String userId, Map<String, Object> proposal) {
    List<Map<String, Object>> blocks = RecordService.maps(proposal.get("blocks"));
    if (blocks.isEmpty()) throw new ApiException(400, "A proposal needs at least one block.");
    assertNoOverlap(blocks);
    return records.writeProposal(userId, proposal);
  }

  public Map<String, Object> approve(String userId, Map<String, Object> proposal) {
    List<Map<String, Object>> proposed = RecordService.maps(proposal.get("blocks"));
    if (proposed.isEmpty()) throw new ApiException(400, "Approve a proposal that still has blocks.");
    assertNoOverlap(proposed);
    Set<String> dates = new HashSet<>();
    for (Map<String, Object> block : proposed) dates.add(RecordService.text(block.get("date")));

    List<Map<String, Object>> kept = new ArrayList<>();
    for (Map<String, Object> block : records.list(userId, RecordService.SCHEDULES)) {
      String date = RecordService.text(block.get("date"));
      if (!dates.contains(date) || "completed".equals(block.get("status"))) kept.add(block);
    }
    records.deleteAll(userId, RecordService.SCHEDULES);
    for (Map<String, Object> block : kept) records.save(userId, RecordService.SCHEDULES, block);
    for (Map<String, Object> block : proposed) records.save(userId, RecordService.SCHEDULES, block);

    Set<String> taskIds = new HashSet<>();
    for (Map<String, Object> task : records.list(userId, RecordService.TASKS)) {
      taskIds.add(RecordService.text(task.get("id")));
    }
    for (Map<String, Object> task : RecordService.maps(proposal.get("createdTasks"))) {
      String id = RecordService.text(task.get("id"));
      if (!id.isBlank() && taskIds.add(id)) records.create(userId, RecordService.TASKS, task);
    }

    Map<String, Object> profile = profiles.get(userId);
    List<Map<String, Object>> reports = new ArrayList<>(RecordService.maps(profile.get("reports")));
    Map<String, Object> report = new LinkedHashMap<>();
    Object review = proposal.get("review");
    if (review instanceof Map<?, ?> map) map.forEach((key, value) -> report.put(String.valueOf(key), value));
    report.put("id", UUID.randomUUID().toString());
    report.put("savedAt", Instant.now().toString());
    report.put("rationale", proposal.get("rationale"));
    reports.add(report);
    profile.put("reports", reports);
    if (review instanceof Map<?, ?>) profile.put("lastReview", review);
    profiles.save(userId, profile);
    records.clearProposal(userId);
    notify.weekApproved(userId, report);

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("blocks", records.list(userId, RecordService.SCHEDULES));
    response.put("tasks", records.list(userId, RecordService.TASKS));
    response.put("reports", reports);
    response.put("lastReview", profile.get("lastReview"));
    return response;
  }

  public void assertBlockFits(String userId, Map<String, Object> block) {
    int start = minutes(block.get("start"));
    int end = minutes(block.get("end"));
    if (end <= start) throw new ApiException(400, "End time must be after the start time.");
    String date = RecordService.text(block.get("date"));
    if (date.isBlank()) throw new ApiException(400, "A date is required.");
    String id = RecordService.text(block.get("id"));
    for (Map<String, Object> other : records.list(userId, RecordService.SCHEDULES)) {
      if (id.equals(RecordService.text(other.get("id")))) continue;
      if (!date.equals(RecordService.text(other.get("date")))) continue;
      int otherStart = minutes(other.get("start"));
      int otherEnd = minutes(other.get("end"));
      if (start < otherEnd && otherStart < end) {
        throw new ApiException(400, "That time overlaps another block.");
      }
    }
  }

  private void assertNoOverlap(List<Map<String, Object>> blocks) {
    for (int i = 0; i < blocks.size(); i += 1) {
      Map<String, Object> left = blocks.get(i);
      int start = minutes(left.get("start"));
      int end = minutes(left.get("end"));
      if (end <= start) throw new ApiException(400, "End time must be after the start time.");
      for (int j = i + 1; j < blocks.size(); j += 1) {
        Map<String, Object> right = blocks.get(j);
        if (!RecordService.text(left.get("date")).equals(RecordService.text(right.get("date")))) continue;
        int otherStart = minutes(right.get("start"));
        int otherEnd = minutes(right.get("end"));
        if (start < otherEnd && otherStart < end) {
          throw new ApiException(400, "That proposal overlaps itself. Adjust the times before saving.");
        }
      }
    }
  }

  private int minutes(Object value) {
    String text = RecordService.text(value);
    String[] parts = text.split(":");
    if (parts.length < 2) throw new ApiException(400, "Use a time like 07:30.");
    try {
      return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
    } catch (NumberFormatException ex) {
      throw new ApiException(400, "Use a time like 07:30.");
    }
  }
}
