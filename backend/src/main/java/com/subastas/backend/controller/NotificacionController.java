package com.subastas.backend.controller;

import com.subastas.backend.dto.common.MessageResponse;
import com.subastas.backend.dto.notifications.NotificacionResponse;
import com.subastas.backend.service.NotificacionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping
public class NotificacionController {

    private final NotificacionService notificacionService;

    public NotificacionController(NotificacionService notificacionService) {
        this.notificacionService = notificacionService;
    }

    @GetMapping("/notifications")
    public ResponseEntity<List<NotificacionResponse>> listarNotificaciones() {
        return ResponseEntity.ok(notificacionService.listarNotificaciones());
    }

    @PatchMapping("/notifications/{id}/read")
    public ResponseEntity<MessageResponse> marcarLeida(@PathVariable Integer id) {
        return ResponseEntity.ok(notificacionService.marcarLeida(id));
    }
}
