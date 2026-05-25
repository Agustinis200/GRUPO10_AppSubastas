package com.subastas.backend.controller;

import com.subastas.backend.dto.stats.EstadisticasUsuarioResponse;
import com.subastas.backend.service.EstadisticaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
public class EstadisticaController {

    private final EstadisticaService estadisticaService;

    public EstadisticaController(EstadisticaService estadisticaService) {
        this.estadisticaService = estadisticaService;
    }

    @GetMapping("/users/me/stats")
    public ResponseEntity<EstadisticasUsuarioResponse> obtenerEstadisticas() {
        return ResponseEntity.ok(estadisticaService.obtenerEstadisticas());
    }
}
