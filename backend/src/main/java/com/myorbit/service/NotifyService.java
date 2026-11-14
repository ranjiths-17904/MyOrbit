package com.myorbit.service;

import com.myorbit.config.AppProperties;
import com.myorbit.model.UserAccount;
import com.myorbit.web.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.Properties;

@Service
public class NotifyService {
  private static final Logger log = LoggerFactory.getLogger(NotifyService.class);
  private final AppProperties properties;
  private final AuthService auth;
  private final RecordService records;
  private final RestClient http = RestClient.create();

  public NotifyService(AppProperties properties, AuthService auth, RecordService records) {
    this.properties = properties;
    this.auth = auth;
    this.records = records;
  }

  public void weekApproved(String userId, Map<String, Object> report) {
    try {
      deliver(userId, "Your new week is ready", "You approved a new MyOrbit week. Open the app to follow the timetable.");
    } catch (Exception ex) {
      log.warn("Week approval notice was not delivered: {}", ex.getMessage());
    }
  }

  public void sendTest(String userId) {
    Map<String, Object> profile = records.readProfile(userId);
    boolean emailOn = flag(profile, "email") && properties.mailConfigured();
    boolean smsOn = flag(profile, "sms") && properties.smsConfigured();
    if (!emailOn && !smsOn) {
      throw new ApiException(400, "Turn on email or phone in Settings, then fill SMTP or the webhook in backend/application-local.yml.");
    }
    deliver(userId, "MyOrbit test", "This is a test from MyOrbit. This channel is turned on.");
  }

  private void deliver(String userId, String subject, String text) {
    UserAccount user = auth.require(userId);
    Map<String, Object> profile = records.readProfile(userId);
    if (profile == null) return;
    if (flag(profile, "email")) sendMail(user.getEmail(), subject, text);
    if (flag(profile, "sms")) sendWebhook(user.getEmail(), RecordService.text(profile.get("phone")), text);
  }

  private void sendMail(String to, String subject, String text) {
    if (!properties.mailConfigured() || to == null || to.isBlank()) return;
    JavaMailSenderImpl sender = new JavaMailSenderImpl();
    sender.setHost(properties.getMailHost());
    sender.setPort(properties.getMailPort());
    sender.setUsername(properties.getMailUsername());
    sender.setPassword(properties.getMailPassword());
    Properties mail = sender.getJavaMailProperties();
    mail.put("mail.smtp.auth", "true");
    mail.put("mail.smtp.starttls.enable", Boolean.toString(properties.isMailStartTls()));
    SimpleMailMessage message = new SimpleMailMessage();
    String from = properties.getMailFrom();
    message.setFrom(from == null || from.isBlank() ? properties.getMailUsername() : from);
    message.setTo(to);
    message.setSubject(subject);
    message.setText(text);
    try {
      sender.send(message);
    } catch (Exception ex) {
      log.warn("Mail send failed");
      throw new ApiException(502, "The mail server refused the message. Check the SMTP values in application-local.yml.");
    }
  }

  private void sendWebhook(String email, String phone, String text) {
    if (!properties.smsConfigured()) return;
    try {
      http.post()
          .uri(properties.getSmsWebhookUrl())
          .contentType(MediaType.APPLICATION_JSON)
          .body(Map.of("email", email, "phone", phone, "text", text))
          .retrieve()
          .toBodilessEntity();
    } catch (Exception ex) {
      log.warn("Phone webhook failed");
      throw new ApiException(502, "The phone webhook did not accept the message. Check SMS_WEBHOOK_URL.");
    }
  }

  @SuppressWarnings("unchecked")
  private boolean flag(Map<String, Object> profile, String key) {
    Object notifications = profile.get("notifications");
    if (!(notifications instanceof Map<?, ?> map)) return false;
    Object value = map.get(key);
    return Boolean.TRUE.equals(value) || "true".equals(value);
  }
}
