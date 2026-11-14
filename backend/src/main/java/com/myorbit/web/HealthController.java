package com.myorbit.web;

import com.myorbit.config.AppProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class HealthController {
  private final AppProperties properties;

  public HealthController(AppProperties properties) {
    this.properties = properties;
  }

  @GetMapping("/api/health")
  public Map<String, Object> health() {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("status", "ok");
    body.put("mailConfigured", properties.mailConfigured());
    body.put("llmConfigured", properties.llmConfigured());
    body.put("smsConfigured", properties.smsConfigured());
    return body;
  }
}
