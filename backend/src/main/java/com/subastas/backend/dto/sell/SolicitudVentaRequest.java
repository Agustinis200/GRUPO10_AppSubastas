package com.subastas.backend.dto.sell;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SolicitudVentaRequest {
    @NotBlank
    private String descripcionCompleta; // PDF url o base64

    private String descripcionCatalogo;

    @NotNull
    @Size(min = 6)
    private List<String> fotos; // base64

    private String historia;

    @NotNull
    private Boolean declaracionPropiedad;

    @NotNull
    private Boolean aceptaDevolucionConCargo;
}
