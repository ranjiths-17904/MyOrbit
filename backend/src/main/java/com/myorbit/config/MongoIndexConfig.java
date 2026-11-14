package com.myorbit.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class MongoIndexConfig implements ApplicationRunner {
  private final MongoTemplate mongo;

  public MongoIndexConfig(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  @Override
  public void run(ApplicationArguments args) {
    mongo.indexOps("users").ensureIndex(new Index().on("email", Sort.Direction.ASC).unique());
    for (String collection : List.of(
        "userProfiles", "skills", "goals", "tasks", "schedules", "notes",
        "fitnessRecords", "habits", "mobileUsage", "notifications", "proposals", "weeklyReports", "learningResources")) {
      mongo.indexOps(collection).ensureIndex(new Index().on("userId", Sort.Direction.ASC));
    }
    mongo.indexOps("schedules").ensureIndex(new Index().on("userId", Sort.Direction.ASC).on("date", Sort.Direction.ASC));
    mongo.indexOps("fitnessRecords").ensureIndex(new Index().on("userId", Sort.Direction.ASC).on("date", Sort.Direction.ASC).unique());
    mongo.indexOps("mobileUsage").ensureIndex(new Index().on("userId", Sort.Direction.ASC).on("date", Sort.Direction.ASC).unique());
  }
}
