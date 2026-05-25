package com.subastas.backend.service;

import com.subastas.backend.dto.common.MessageResponse;
import com.subastas.backend.dto.notifications.NotificacionResponse;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class NotificacionService {
    public List<NotificacionResponse> listarNotificaciones() {
        return Collections.emptyList();
    }

    public MessageResponse marcarLeida(Integer id) {
        return MessageResponse.builder().message("Notificación marcada como leída").build();
    }
}
