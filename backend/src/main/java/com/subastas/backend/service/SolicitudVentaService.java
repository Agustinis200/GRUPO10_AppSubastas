package com.subastas.backend.service;

import com.subastas.backend.dto.common.MessageResponse;
import com.subastas.backend.dto.sell.SolicitudVentaRequest;
import com.subastas.backend.dto.sell.SolicitudVentaResponse;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class SolicitudVentaService {
    public List<SolicitudVentaResponse> listarSolicitudes() {
        return Collections.emptyList();
    }

    public SolicitudVentaResponse crearSolicitud(SolicitudVentaRequest request) {
        return SolicitudVentaResponse.builder().build();
    }

    public SolicitudVentaResponse detalleSolicitud(Integer id) {
        return SolicitudVentaResponse.builder().build();
    }

    public MessageResponse aceptarTerminos(Integer id) {
        return MessageResponse.builder().message("Condiciones aceptadas").build();
    }

    public MessageResponse rechazarTerminos(Integer id) {
        return MessageResponse.builder().message("Condiciones rechazadas").build();
    }
}
