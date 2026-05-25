package com.subastas.backend.service;

import com.subastas.backend.dto.stats.EstadisticasUsuarioResponse;
import org.springframework.stereotype.Service;

@Service
public class EstadisticaService {
    public EstadisticasUsuarioResponse obtenerEstadisticas() {
        return EstadisticasUsuarioResponse.builder().build();
    }
}
