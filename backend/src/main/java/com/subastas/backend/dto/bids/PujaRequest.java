package com.subastas.backend.dto.bids;

import lombok.*;

import jakarta.validation.constraints.NotNull;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PujaRequest {
    @NotNull
    private Integer asistenteId;

    @NotNull
    private Integer itemCatalogoId;

    @NotNull
    private Double importe;
}
