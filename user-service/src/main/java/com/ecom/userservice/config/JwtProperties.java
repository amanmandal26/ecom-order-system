package com.ecom.userservice.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "jwt")
@Getter
@Setter
public class JwtProperties {

    private String secret;
    // Access token lifetime in ms — short-lived so a stolen token is useless fast
    private long expiration;
    // Refresh token lifetime in ms — long-lived, stored in DB, rotated on every use
    private long refreshExpiration;
}
