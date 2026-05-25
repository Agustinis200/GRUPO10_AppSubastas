package com.subastas.backend.dto.auctions;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UbicacionResponse {
    private Integer productoId;
    private String deposito;
    private String direccion;
}
