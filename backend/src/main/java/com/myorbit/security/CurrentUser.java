package com.myorbit.security;

import com.myorbit.web.ApiException;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUser {
  private CurrentUser() {}

  public static String id() {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || auth.getPrincipal() == null || "anonymousUser".equals(auth.getPrincipal())) {
      throw new ApiException(401, "Sign in again.");
    }
    return String.valueOf(auth.getPrincipal());
  }
}
