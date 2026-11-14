package com.myorbit.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthRequests {
  private AuthRequests() {}

  public record RegisterRequest(
      @NotBlank @Size(max = 80) String name,
      @NotBlank @Email @Size(max = 160) String email,
      @NotBlank @Size(min = 8, max = 100) String password,
      @Size(max = 120) String careerTarget
  ) {}

  public record LoginRequest(
      @NotBlank @Email String email,
      @NotBlank String password
  ) {}

  public record PasswordRequest(
      @NotBlank String currentPassword,
      @NotBlank @Size(min = 8, max = 100) String newPassword
  ) {}

  public record MessageRequest(@NotBlank @Size(max = 4000) String message) {}
}
