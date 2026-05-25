package com.subastas.backend.dto.users;

import com.subastas.backend.enums.Categoria;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UsuarioResponse {
    private Integer identificador;
    private String documento;
    private String nombre;
    private String direccion;
    private String estado;
    private Boolean admitido;
    private Categoria categoria;
}
