package com.subastas.backend.dto.payment;

import lombok.*;

import jakarta.validation.constraints.NotNull;
import com.subastas.backend.enums.Moneda;
import com.subastas.backend.enums.TipoMedioPago;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedioPagoRequest {
    @NotNull
    private TipoMedioPago tipo;

    @NotNull
    private Moneda moneda;

    private String numero;

    private String banco;

    private Double montoGarantia;
}
