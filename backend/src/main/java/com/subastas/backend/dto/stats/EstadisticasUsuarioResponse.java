package com.subastas.backend.dto.stats;

import com.subastas.backend.enums.Categoria;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EstadisticasUsuarioResponse {
    private Integer subastasAsistidas;
    private Integer subastasGanadas;
    private Double totalOfertado;
    private Double totalPagado;
    private Categoria categoriaActual;
}
