package com.subastas.backend.dto.insurance;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeguroResponse {
    private String nroPoliza;
    private String compania;
    private String polizaCombinada;
    private Double importe;
}
