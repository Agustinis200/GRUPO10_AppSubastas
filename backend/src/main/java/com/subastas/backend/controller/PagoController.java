package com.subastas.backend.controller;

import com.subastas.backend.dto.common.MessageResponse;
import com.subastas.backend.dto.payment.PaymentRequest;
import com.subastas.backend.dto.payment.PagoResponse;
import com.subastas.backend.service.PagoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping
public class PagoController {

    private final PagoService pagoService;

    public PagoController(PagoService pagoService) {
        this.pagoService = pagoService;
    }

    @PostMapping("/payments")
    public ResponseEntity<PagoResponse> generarPago(@Valid @RequestBody PaymentRequest request) {
        return ResponseEntity.status(201).body(pagoService.generarPago(request));
    }

    @PostMapping("/payments/{id}/confirm")
    public ResponseEntity<MessageResponse> confirmarPago(@PathVariable Integer id) {
        return ResponseEntity.ok(pagoService.confirmarPago(id));
    }
}
