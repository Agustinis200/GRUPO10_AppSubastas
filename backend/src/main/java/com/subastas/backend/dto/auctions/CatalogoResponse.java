package com.subastas.backend.dto.auctions;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CatalogoResponse {
    private Integer identificador;
    private String descripcion;
    private Integer subastaId;
    private Integer responsableId;
}
