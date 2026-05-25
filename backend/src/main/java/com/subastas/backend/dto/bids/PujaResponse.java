package com.subastas.backend.dto.bids;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PujaResponse {
    private Integer identificador;
    private Integer asistenteId;
    private Integer itemCatalogoId;
    private Double importe;
    private Boolean ganador;
}
