package com.ecom.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.security.Key;
import java.util.List;

@Component
public class JwtAuthFilter implements GlobalFilter, Ordered {

    private static final String SECRET = "ecom-super-secret-key-that-is-long-enough-for-hs256-algorithm";

    // These paths bypass JWT validation at the gateway level.
    // /api/auth/ prefix covers login, register, forgot-password, reset-password, AND refresh.
    // refresh uses its own auth (the refresh token in the body), so no JWT is needed at the gateway.
    // logout is covered by the /api/auth/ prefix too — user-service's own SecurityConfig
    // enforces JWT validation for that specific endpoint internally.
    private static final List<String> PUBLIC_PATHS = List.of(
        "/api/auth/",
        "/api/sellers/register"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path   = exchange.getRequest().getURI().getPath();
        String method = exchange.getRequest().getMethod().name();

        if (isPublicPath(path, method)) {
            return chain.filter(exchange);
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        String token = authHeader.substring(7);

        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            // Forward identity headers so downstream services read a trusted header
            // instead of re-parsing the JWT. String.valueOf handles Integer/Long ambiguity
            // in JJWT's JSON number deserialization.
            String userId       = String.valueOf(claims.get("userId"));
            String role         = String.valueOf(claims.get("role"));
            String email        = claims.getSubject();
            Object bizNameObj   = claims.get("businessName");
            String businessName = bizNameObj != null ? bizNameObj.toString() : "";

            exchange = exchange.mutate()
                    .request(r -> r
                        .header("X-User-Name",            email)
                        .header("X-User-Id",              userId)
                        .header("X-User-Role",            role)
                        .header("X-User-Email",           email)
                        .header("X-Seller-Business-Name", businessName))
                    .build();

        } catch (JwtException e) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        // Run before all other filters
        return -1;
    }

    private boolean isPublicPath(String path, String method) {
        if (PUBLIC_PATHS.stream().anyMatch(path::startsWith)) return true;
        // Product browsing is public for GET requests; /my-products requires SELLER auth
        return "GET".equals(method)
            && path.startsWith("/api/products")
            && !path.startsWith("/api/products/my-products");
    }

    private Key getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(
                java.util.Base64.getEncoder().encodeToString(SECRET.getBytes())
        );
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
