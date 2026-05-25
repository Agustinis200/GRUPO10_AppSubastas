package com.subastas.backend.controller;

import com.subastas.backend.dto.auctions.AsistenteResponse;
import com.subastas.backend.dto.auctions.CatalogoResponse;
import com.subastas.backend.dto.auctions.ItemCatalogoResponse;
import com.subastas.backend.dto.auctions.SubastaResponse;
import com.subastas.backend.dto.common.MessageResponse;
import com.subastas.backend.enums.Categoria;
import com.subastas.backend.service.SubastaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping
public class SubastaController {

    private final SubastaService subastaService;

    public SubastaController(SubastaService subastaService) {
        this.subastaService = subastaService;
    }

    @GetMapping("/auctions")
    public ResponseEntity<List<SubastaResponse>> listarSubastas(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) Categoria categoria) {
        return ResponseEntity.ok(subastaService.listarSubastas(estado, categoria));
    }

    @GetMapping("/auctions/{id}")
    public ResponseEntity<SubastaResponse> detalleSubasta(@PathVariable Integer id) {
        return ResponseEntity.ok(subastaService.detalleSubasta(id));
    }

    @PostMapping("/auctions/{id}/join")
    public ResponseEntity<AsistenteResponse> ingresarSubasta(@PathVariable Integer id) {
        return ResponseEntity.ok(subastaService.ingresarSubasta(id));
    }

    @PostMapping("/auctions/{id}/leave")
    public ResponseEntity<MessageResponse> salirSubasta(@PathVariable Integer id) {
        return ResponseEntity.ok(subastaService.salirSubasta(id));
    }

    @GetMapping("/auctions/{id}/catalog")
    public ResponseEntity<CatalogoResponse> verCatalogo(@PathVariable Integer id) {
        return ResponseEntity.ok(subastaService.obtenerCatalogo(id));
    }

    @GetMapping("/auctions/{id}/items")
    public ResponseEntity<List<ItemCatalogoResponse>> listarItems(@PathVariable Integer id) {
        return ResponseEntity.ok(subastaService.listarItemsSubasta(id));
    }
}
