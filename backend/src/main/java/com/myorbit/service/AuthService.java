package com.myorbit.service;

import com.myorbit.model.UserAccount;
import com.myorbit.repo.UserRepository;
import com.myorbit.security.JwtService;
import com.myorbit.web.ApiException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {
  private final UserRepository users;
  private final PasswordEncoder encoder;
  private final JwtService jwt;
  private final RecordService records;

  public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt, RecordService records) {
    this.users = users;
    this.encoder = encoder;
    this.jwt = jwt;
    this.records = records;
  }

  public Map<String, Object> register(String name, String email, String password, String careerTarget) {
    String normalized = email.trim().toLowerCase();
    if (users.findByEmail(normalized).isPresent()) {
      throw new ApiException(409, "An account with that email already exists.");
    }
    UserAccount user = new UserAccount();
    user.setId(UUID.randomUUID().toString());
    user.setName(name.trim());
    user.setEmail(normalized);
    user.setPasswordHash(encoder.encode(password));
    user.setCreatedAt(Instant.now());
    users.save(user);
    records.writeProfile(user.getId(), defaultProfile(user, careerTarget));
    return tokenResponse(user);
  }

  public Map<String, Object> login(String email, String password) {
    UserAccount user = users.findByEmail(email.trim().toLowerCase())
        .orElseThrow(() -> new ApiException(401, "Email or password does not match."));
    if (!encoder.matches(password, user.getPasswordHash())) {
      throw new ApiException(401, "Email or password does not match.");
    }
    return tokenResponse(user);
  }

  public void changePassword(String userId, String currentPassword, String nextPassword) {
    UserAccount user = users.findById(userId).orElseThrow(() -> new ApiException(401, "Sign in again."));
    if (!encoder.matches(currentPassword, user.getPasswordHash())) {
      throw new ApiException(400, "Current password does not match.");
    }
    if (nextPassword == null || nextPassword.length() < 8) {
      throw new ApiException(400, "Use at least 8 characters.");
    }
    user.setPasswordHash(encoder.encode(nextPassword));
    users.save(user);
  }

  public UserAccount require(String userId) {
    return users.findById(userId).orElseThrow(() -> new ApiException(401, "Sign in again."));
  }

  private Map<String, Object> tokenResponse(UserAccount user) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("token", jwt.create(user.getId(), user.getEmail()));
    body.put("user", Map.of("id", user.getId(), "email", user.getEmail(), "name", user.getName()));
    return body;
  }

  private Map<String, Object> defaultProfile(UserAccount user, String careerTarget) {
    Map<String, Object> fitness = new LinkedHashMap<>();
    fitness.put("exerciseMinutes", 30);
    fitness.put("waterGlasses", 8);
    fitness.put("sleepHours", 7);
    fitness.put("restDays", List.of(0));
    Map<String, Object> notifications = new LinkedHashMap<>();
    notifications.put("web", false);
    notifications.put("email", false);
    notifications.put("sms", false);
    Map<String, Object> profile = new LinkedHashMap<>();
    profile.put("name", user.getName());
    profile.put("email", user.getEmail());
    profile.put("careerTarget", careerTarget == null ? "" : careerTarget.trim());
    profile.put("wakeTime", "06:00");
    profile.put("sleepTime", "23:00");
    profile.put("studyHoursPerDay", 4);
    profile.put("studyDays", List.of(1, 2, 3, 4, 5, 6));
    profile.put("preferredStudyStart", "07:30");
    profile.put("planStart", LocalDate.now().toString());
    profile.put("onboarded", false);
    profile.put("familyBlocks", List.of());
    profile.put("fitness", fitness);
    profile.put("mobileLimitMinutes", 120);
    profile.put("notifications", notifications);
    profile.put("goals", List.of());
    profile.put("reports", List.of());
    profile.put("phone", "");
    return profile;
  }
}
