package com.subastas.backend.dto.sell;

import lombok.*;

import com.subastas.backend.dto.bids.PujaResponse;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SolicitudVentaResponse {
    private Integer identificador;
    private Integer productoId;
    private String estado;
    private String motivoRechazo;
    private Double valorBasePropuesto;
    private Double comisionPropuesta;
}
