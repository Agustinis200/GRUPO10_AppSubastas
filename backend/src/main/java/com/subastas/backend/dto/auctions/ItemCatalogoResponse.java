package com.subastas.backend.dto.auctions;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemCatalogoResponse {
    private Integer identificador;
    private Integer catalogoId;
    private Integer productoId;
    private Double precioBase;
    private Double comision;
    private String subastado;
    private ProductoResponse producto;
}
