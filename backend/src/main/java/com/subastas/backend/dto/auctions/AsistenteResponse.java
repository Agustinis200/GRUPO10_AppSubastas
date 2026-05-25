package com.subastas.backend.dto.auctions;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AsistenteResponse {
    private Integer identificador;
    private Integer numeroPostor;
    private Integer clienteId;
    private Integer subastaId;
}
