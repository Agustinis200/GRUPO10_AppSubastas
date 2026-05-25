package com.subastas.backend.controller;

import com.subastas.backend.dto.common.MessageResponse;
import com.subastas.backend.dto.payment.MedioPagoRequest;
import com.subastas.backend.dto.payment.MedioPagoResponse;
import com.subastas.backend.service.MedioPagoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping
public class MedioPagoController {

    private final MedioPagoService medioPagoService;

    public MedioPagoController(MedioPagoService medioPagoService) {
        this.medioPagoService = medioPagoService;
    }

    @GetMapping("/payment-methods")
    public ResponseEntity<List<MedioPagoResponse>> listarMediosPago() {
        return ResponseEntity.ok(medioPagoService.listarMedios());
    }

    @PostMapping("/payment-methods")
    public ResponseEntity<MedioPagoResponse> registrarMedioPago(@Valid @RequestBody MedioPagoRequest request) {
        return ResponseEntity.status(201).body(medioPagoService.registrarMedio(request));
    }

    @DeleteMapping("/payment-methods/{id}")
    public ResponseEntity<MessageResponse> eliminarMedioPago(@PathVariable Integer id) {
        return ResponseEntity.ok(medioPagoService.eliminarMedio(id));
    }
}
