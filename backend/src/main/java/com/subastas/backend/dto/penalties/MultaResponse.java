package com.subastas.backend.dto.penalties;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MultaResponse {
    private Integer identificador;
    private Double importe;
    private Double porcentaje;
    private String estado;
    private Integer plazoRegularizacionHoras;
}
