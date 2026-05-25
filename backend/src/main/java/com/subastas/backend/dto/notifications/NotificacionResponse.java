package com.subastas.backend.dto.notifications;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificacionResponse {
    private Integer identificador;
    private String titulo;
    private String mensaje;
    private Boolean leida;
}
