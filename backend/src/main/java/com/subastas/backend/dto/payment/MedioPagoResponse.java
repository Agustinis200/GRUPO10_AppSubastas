package com.subastas.backend.dto.payment;

import com.subastas.backend.enums.Moneda;
import com.subastas.backend.enums.TipoMedioPago;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedioPagoResponse {
    private Integer identificador;
    private TipoMedioPago tipo;
    private Moneda moneda;
    private Boolean verificado;
    private Double montoGarantia;
}
