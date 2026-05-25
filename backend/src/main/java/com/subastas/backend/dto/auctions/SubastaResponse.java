package com.subastas.backend.dto.auctions;

import com.subastas.backend.enums.Categoria;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubastaResponse {
    private Integer identificador;
    private String fecha;
    private String hora;
    private String estado;
    private Integer subastadorId;
    private String ubicacion;
    private Integer capacidadAsistentes;
    private String tieneDeposito;
    private String seguridadPropia;
    private Categoria categoria;
}
