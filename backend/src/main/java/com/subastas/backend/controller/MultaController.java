package com.subastas.backend.controller;

import com.subastas.backend.dto.common.MessageResponse;
import com.subastas.backend.dto.penalties.MultaResponse;
import com.subastas.backend.service.MultaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping
public class MultaController {

    private final MultaService multaService;

    public MultaController(MultaService multaService) {
        this.multaService = multaService;
    }

    @GetMapping("/penalties")
    public ResponseEntity<List<MultaResponse>> listarMultas() {
        return ResponseEntity.ok(multaService.listarMultas());
    }

    @PostMapping("/penalties/{id}/pay")
    public ResponseEntity<MessageResponse> pagarMulta(@PathVariable Integer id) {
        return ResponseEntity.ok(multaService.pagarMulta(id));
    }
}
