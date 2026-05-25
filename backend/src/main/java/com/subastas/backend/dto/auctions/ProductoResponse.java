package com.subastas.backend.dto.auctions;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductoResponse {
    private Integer identificador;
    private String fecha;
    private String disponible;
    private String descripcionCatalogo;
    private String descripcionCompleta;
    private Integer revisorId;
    private Integer duenioId;
    private String seguro;
}
