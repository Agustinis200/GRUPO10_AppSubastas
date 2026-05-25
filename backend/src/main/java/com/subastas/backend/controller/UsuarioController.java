package com.subastas.backend.controller;

import com.subastas.backend.dto.bids.PujaResponse;
import com.subastas.backend.dto.common.MessageResponse;
import com.subastas.backend.dto.users.PreRegistroRequest;
import com.subastas.backend.dto.users.RegistroCompletoRequest;
import com.subastas.backend.dto.users.UsuarioResponse;
import com.subastas.backend.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping("/users/pre-register")
    public ResponseEntity<MessageResponse> preRegistro(@Valid @RequestBody PreRegistroRequest request) {
        return ResponseEntity.status(201).body(usuarioService.preRegistro(request));
    }

    @PostMapping("/users/complete-registration")
    public ResponseEntity<MessageResponse> completarRegistro(@Valid @RequestBody RegistroCompletoRequest request) {
        return ResponseEntity.ok(usuarioService.completarRegistro(request));
    }

    @GetMapping("/users/me")
    public ResponseEntity<UsuarioResponse> obtenerPerfil() {
        return ResponseEntity.ok(usuarioService.obtenerPerfil());
    }

    @GetMapping("/users/me/bids")
    public ResponseEntity<List<PujaResponse>> obtenerMisPujas() {
        return ResponseEntity.ok(usuarioService.obtenerMisPujas());
    }
}
