package com.subastas.backend.dto.users;

import lombok.*;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PreRegistroRequest {
    @NotBlank
    private String documento;

    @NotBlank
    private String nombre;

    @NotBlank
    private String direccion;

    @NotNull
    private Integer paisId;

    @NotBlank
    private String fotoDocumentoFrente; // base64

    @NotBlank
    private String fotoDocumentoDorso; // base64
}
