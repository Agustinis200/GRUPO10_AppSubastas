package com.subastas.backend.dto.payment;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PagoResponse {
    private Integer identificador;
    private Double importe;
    private Double comision;
    private Double costoEnvio;
    private String estado;
}
