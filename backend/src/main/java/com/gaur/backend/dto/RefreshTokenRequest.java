package com.gaur.backend.dto;

public class RefreshTokenRequest {
    private String refreshToken;
    /** Optional: still-valid access token for sliding renewal. */
    private String token;

    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
}
