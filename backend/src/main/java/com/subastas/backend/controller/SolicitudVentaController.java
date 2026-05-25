package com.subastas.backend.controller;

import com.subastas.backend.dto.common.MessageResponse;
import com.subastas.backend.dto.sell.SolicitudVentaRequest;
import com.subastas.backend.dto.sell.SolicitudVentaResponse;
import com.subastas.backend.service.SolicitudVentaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping
public class SolicitudVentaController {

    private final SolicitudVentaService solicitudVentaService;

    public SolicitudVentaController(SolicitudVentaService solicitudVentaService) {
        this.solicitudVentaService = solicitudVentaService;
    }

    @GetMapping("/sell-requests")
    public ResponseEntity<List<SolicitudVentaResponse>> listarSolicitudes() {
        return ResponseEntity.ok(solicitudVentaService.listarSolicitudes());
    }

    @PostMapping("/sell-requests")
    public ResponseEntity<SolicitudVentaResponse> crearSolicitud(@Valid @RequestBody SolicitudVentaRequest request) {
        return ResponseEntity.status(201).body(solicitudVentaService.crearSolicitud(request));
    }

    @GetMapping("/sell-requests/{id}")
    public ResponseEntity<SolicitudVentaResponse> detalleSolicitud(@PathVariable Integer id) {
        return ResponseEntity.ok(solicitudVentaService.detalleSolicitud(id));
    }

    @PostMapping("/sell-requests/{id}/accept-terms")
    public ResponseEntity<MessageResponse> aceptarTerminos(@PathVariable Integer id) {
        return ResponseEntity.ok(solicitudVentaService.aceptarTerminos(id));
    }

    @PostMapping("/sell-requests/{id}/reject-terms")
    public ResponseEntity<MessageResponse> rechazarTerminos(@PathVariable Integer id) {
        return ResponseEntity.ok(solicitudVentaService.rechazarTerminos(id));
    }
}
