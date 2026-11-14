package com.myorbit.security;

import com.myorbit.config.AppProperties;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
public class JwtService {
  private final AppProperties properties;

  public JwtService(AppProperties properties) {
    this.properties = properties;
  }

  public String create(String userId, String email) {
    Instant now = Instant.now();
    return Jwts.builder()
        .subject(userId)
        .claim("email", email)
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plus(14, ChronoUnit.DAYS)))
        .signWith(key())
        .compact();
  }

  public String userId(String token) {
    return Jwts.parser()
        .verifyWith(key())
        .build()
        .parseSignedClaims(token)
        .getPayload()
        .getSubject();
  }

  private SecretKey key() {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256")
          .digest(properties.getJwtSecret().getBytes(StandardCharsets.UTF_8));
      return Keys.hmacShaKeyFor(digest);
    } catch (Exception ex) {
      throw new IllegalStateException("JWT secret could not be prepared", ex);
    }
  }
}
