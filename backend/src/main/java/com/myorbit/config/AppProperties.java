package com.myorbit.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {
  private String jwtSecret = "dev-only-change-this-secret";
  private String llmUrl = "";
  private String llmKey = "";
  private String llmModel = "llama-3.1-8b-instant";
  private String smsWebhookUrl = "";
  private String mailHost = "";
  private int mailPort = 587;
  private String mailUsername = "";
  private String mailPassword = "";
  private String mailFrom = "";
  private boolean mailStartTls = true;

  public boolean mailConfigured() {
    return notBlank(mailHost) && notBlank(mailUsername);
  }

  public boolean llmConfigured() {
    return notBlank(llmUrl) && notBlank(llmKey);
  }

  public boolean smsConfigured() {
    return notBlank(smsWebhookUrl) && (smsWebhookUrl.startsWith("https://") || smsWebhookUrl.startsWith("http://"));
  }

  private static boolean notBlank(String value) {
    return value != null && !value.isBlank();
  }

  public String getJwtSecret() { return jwtSecret; }
  public void setJwtSecret(String jwtSecret) { this.jwtSecret = jwtSecret; }
  public String getLlmUrl() { return llmUrl; }
  public void setLlmUrl(String llmUrl) { this.llmUrl = llmUrl; }
  public String getLlmKey() { return llmKey; }
  public void setLlmKey(String llmKey) { this.llmKey = llmKey; }
  public String getLlmModel() { return llmModel; }
  public void setLlmModel(String llmModel) { this.llmModel = llmModel; }
  public String getSmsWebhookUrl() { return smsWebhookUrl; }
  public void setSmsWebhookUrl(String smsWebhookUrl) { this.smsWebhookUrl = smsWebhookUrl; }
  public String getMailHost() { return mailHost; }
  public void setMailHost(String mailHost) { this.mailHost = mailHost; }
  public int getMailPort() { return mailPort; }
  public void setMailPort(int mailPort) { this.mailPort = mailPort; }
  public String getMailUsername() { return mailUsername; }
  public void setMailUsername(String mailUsername) { this.mailUsername = mailUsername; }
  public String getMailPassword() { return mailPassword; }
  public void setMailPassword(String mailPassword) { this.mailPassword = mailPassword; }
  public String getMailFrom() { return mailFrom; }
  public void setMailFrom(String mailFrom) { this.mailFrom = mailFrom; }
  public boolean isMailStartTls() { return mailStartTls; }
  public void setMailStartTls(boolean mailStartTls) { this.mailStartTls = mailStartTls; }
}
