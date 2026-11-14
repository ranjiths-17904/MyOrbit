package com.myorbit.service;

import com.myorbit.web.ApiException;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class RecordService {
  public static final String SKILLS = "skills";
  public static final String GOALS = "goals";
  public static final String TASKS = "tasks";
  public static final String SCHEDULES = "schedules";
  public static final String NOTES = "notes";
  public static final String FITNESS = "fitnessRecords";
  public static final String HABITS = "habits";
  public static final String MOBILE = "mobileUsage";
  public static final String NOTIFICATIONS = "notifications";
  public static final String PROPOSALS = "proposals";
  public static final String REPORTS = "weeklyReports";
  public static final String RESOURCES = "learningResources";
  public static final String PROFILES = "userProfiles";

  private final MongoTemplate mongo;

  public RecordService(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  public List<Map<String, Object>> list(String userId, String collection) {
    Query query = Query.query(Criteria.where("userId").is(userId));
    return mongo.find(query, Document.class, collection).stream().map(this::toClient).toList();
  }

  public Map<String, Object> save(String userId, String collection, Map<String, Object> body) {
    String id = text(body.get("id"));
    if (id.isBlank()) id = UUID.randomUUID().toString();
    return write(userId, collection, id, body);
  }

  public Map<String, Object> create(String userId, String collection, Map<String, Object> body) {
    String id = text(body.get("id"));
    if (id.isBlank()) id = UUID.randomUUID().toString();
    if (mongo.exists(owned(userId, id), collection)) {
      throw new ApiException(409, "That record already exists.");
    }
    return write(userId, collection, id, body);
  }

  public Map<String, Object> replace(String userId, String collection, String id, Map<String, Object> body) {
    if (!mongo.exists(owned(userId, id), collection)) {
      throw new ApiException(404, "That record was not found.");
    }
    body.put("id", id);
    return write(userId, collection, id, body);
  }

  public void delete(String userId, String collection, String id) {
    mongo.remove(owned(userId, id), collection);
  }

  public void deleteAll(String userId, String collection) {
    mongo.remove(Query.query(Criteria.where("userId").is(userId)), collection);
  }

  public Map<String, Object> upsertByDate(String userId, String collection, Map<String, Object> body) {
    String date = text(body.get("date"));
    if (date.isBlank()) throw new ApiException(400, "A date is required.");
    Document existing = mongo.findOne(Query.query(Criteria.where("userId").is(userId).and("date").is(date)), Document.class, collection);
    String id = existing == null ? text(body.get("id")) : String.valueOf(existing.get("_id"));
    if (id.isBlank()) id = UUID.randomUUID().toString();
    body.put("date", date);
    return write(userId, collection, id, body);
  }

  public Map<String, Object> readProfile(String userId) {
    Document doc = mongo.findById(userId, Document.class, PROFILES);
    return doc == null ? null : toClient(doc);
  }

  public Map<String, Object> writeProfile(String userId, Map<String, Object> body) {
    return write(userId, PROFILES, userId, body);
  }

  public Map<String, Object> readProposal(String userId) {
    Document doc = mongo.findById(userId, Document.class, PROPOSALS);
    return doc == null ? null : toClient(doc);
  }

  public Map<String, Object> writeProposal(String userId, Map<String, Object> body) {
    body.put("savedAt", Instant.now().toString());
    return write(userId, PROPOSALS, userId, body);
  }

  public void clearProposal(String userId) {
    mongo.remove(Query.query(Criteria.where("_id").is(userId)), PROPOSALS);
  }

  public void syncResources(String userId, String skillId, String skillName, Object raw) {
    if (skillId == null || skillId.isBlank()) return;
    mongo.remove(Query.query(Criteria.where("userId").is(userId).and("skillId").is(skillId)), RESOURCES);
    List<?> items = List.of();
    if (raw instanceof List<?> list) items = list;
    int index = 0;
    for (Object item : items) {
      Map<String, Object> doc = new LinkedHashMap<>();
      doc.put("skillId", skillId);
      doc.put("skillName", skillName);
      if (item instanceof Map<?, ?> map) {
        map.forEach((key, value) -> doc.put(String.valueOf(key), value));
      } else if (item != null && !String.valueOf(item).isBlank()) {
        doc.put("title", String.valueOf(item));
      } else {
        continue;
      }
      doc.put("skillId", skillId);
      String id = text(doc.get("id"));
      if (id.isBlank() || id.equals(skillId)) id = skillId + "-" + index;
      doc.put("id", id);
      write(userId, RESOURCES, id, doc);
      index += 1;
    }
  }

  public void deleteResources(String userId, String skillId) {
    mongo.remove(Query.query(Criteria.where("userId").is(userId).and("skillId").is(skillId)), RESOURCES);
  }

  public void replaceOwned(String userId, String collection, Object raw) {
    deleteAll(userId, collection);
    if (!(raw instanceof List<?> list)) return;
    for (Object item : list) {
      if (item instanceof Map<?, ?> map) {
        Map<String, Object> body = cast(map);
        String id = text(body.get("id"));
        if (id.isBlank()) id = UUID.randomUUID().toString();
        write(userId, collection, id, body);
      }
    }
  }

  private Map<String, Object> write(String userId, String collection, String id, Map<String, Object> body) {
    Document doc = new Document();
    body.forEach((key, value) -> {
      if ("id".equals(key) || "_id".equals(key) || "userId".equals(key)) return;
      doc.put(key, value);
    });
    doc.put("_id", id);
    doc.put("id", id);
    doc.put("userId", userId);
    if (!doc.containsKey("updatedAt")) doc.put("updatedAt", Instant.now().toString());
    mongo.save(doc, collection);
    return toClient(doc);
  }

  private Query owned(String userId, String id) {
    return Query.query(Criteria.where("_id").is(id).and("userId").is(userId));
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> cast(Map<?, ?> raw) {
    Map<String, Object> copy = new LinkedHashMap<>();
    raw.forEach((key, value) -> copy.put(String.valueOf(key), value));
    return copy;
  }

  private Map<String, Object> toClient(Document doc) {
    Map<String, Object> copy = new LinkedHashMap<>();
    doc.forEach((key, value) -> {
      if ("_id".equals(key) || "userId".equals(key) || "_class".equals(key)) return;
      copy.put(key, value);
    });
    if (!copy.containsKey("id") && doc.get("_id") != null) copy.put("id", String.valueOf(doc.get("_id")));
    return copy;
  }

  public static String text(Object value) {
    return value == null ? "" : String.valueOf(value).trim();
  }

  public static List<Map<String, Object>> maps(Object raw) {
    List<Map<String, Object>> out = new ArrayList<>();
    if (raw instanceof List<?> list) {
      for (Object item : list) {
        if (item instanceof Map<?, ?> map) {
          Map<String, Object> copy = new LinkedHashMap<>();
          map.forEach((key, value) -> copy.put(String.valueOf(key), value));
          out.add(copy);
        }
      }
    }
    return out;
  }
}
