package com.subastas.backend.controller;

import com.subastas.backend.dto.bids.PujaRequest;
import com.subastas.backend.dto.bids.PujaResponse;
import com.subastas.backend.service.PujaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping
public class PujaController {

    private final PujaService pujaService;

    public PujaController(PujaService pujaService) {
        this.pujaService = pujaService;
    }

    @PostMapping("/bids")
    public ResponseEntity<PujaResponse> crearPuja(@Valid @RequestBody PujaRequest request) {
        return ResponseEntity.status(201).body(pujaService.crearPuja(request));
    }
}
