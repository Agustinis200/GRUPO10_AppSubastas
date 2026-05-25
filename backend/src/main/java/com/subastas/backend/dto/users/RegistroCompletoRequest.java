package com.subastas.backend.dto.users;

import lombok.*;

import jakarta.validation.constraints.NotBlank;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegistroCompletoRequest {
    @NotBlank
    private String email;

    @NotBlank
    private String password;
}
