package com.subastas.backend.dto.payment;

import lombok.*;

import jakarta.validation.constraints.NotNull;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentRequest {
    @NotNull
    private Integer registroSubastaId;

    @NotNull
    private Integer medioPagoId;

    private Boolean retiroPersonal;
}
