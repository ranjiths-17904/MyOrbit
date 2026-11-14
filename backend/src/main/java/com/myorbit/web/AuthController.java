package com.myorbit.web;

import com.myorbit.security.CurrentUser;
import com.myorbit.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService auth;

  public AuthController(AuthService auth) {
    this.auth = auth;
  }

  @PostMapping("/register")
  public Map<String, Object> register(@Valid @RequestBody AuthRequests.RegisterRequest request) {
    return auth.register(request.name(), request.email(), request.password(), request.careerTarget());
  }

  @PostMapping("/login")
  public Map<String, Object> login(@Valid @RequestBody AuthRequests.LoginRequest request) {
    return auth.login(request.email(), request.password());
  }

  @PostMapping("/password")
  public Map<String, Object> password(@Valid @RequestBody AuthRequests.PasswordRequest request) {
    auth.changePassword(CurrentUser.id(), request.currentPassword(), request.newPassword());
    return Map.of("ok", true);
  }
}
