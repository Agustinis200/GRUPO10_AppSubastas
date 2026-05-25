package com.subastas.backend.service;

import com.subastas.backend.dto.auth.AuthResponse;
import com.subastas.backend.dto.auth.LoginRequest;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    public AuthResponse login(LoginRequest request) {
        return AuthResponse.builder().token("jwt-token-placeholder").build();
    }
}
