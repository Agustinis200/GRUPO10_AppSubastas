package com.subastas.backend.controller;

import com.subastas.backend.dto.auctions.ItemCatalogoResponse;
import com.subastas.backend.dto.auctions.UbicacionResponse;
import com.subastas.backend.dto.bids.PujaResponse;
import com.subastas.backend.dto.insurance.SeguroResponse;
import com.subastas.backend.service.ItemService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping
public class ItemController {

    private final ItemService itemService;

    public ItemController(ItemService itemService) {
        this.itemService = itemService;
    }

    @GetMapping("/items/{id}")
    public ResponseEntity<ItemCatalogoResponse> detalleItem(@PathVariable Integer id) {
        return ResponseEntity.ok(itemService.detalleItem(id));
    }

    @GetMapping("/items/{id}/bids")
    public ResponseEntity<List<PujaResponse>> historialPujas(@PathVariable Integer id) {
        return ResponseEntity.ok(itemService.historialPujas(id));
    }

    @GetMapping("/items/{id}/current-bid")
    public ResponseEntity<PujaResponse> pujaActual(@PathVariable Integer id) {
        return ResponseEntity.ok(itemService.pujaActual(id));
    }

    @GetMapping("/items/{id}/insurance")
    public ResponseEntity<SeguroResponse> seguroProducto(@PathVariable Integer id) {
        return ResponseEntity.ok(itemService.obtenerSeguro(id));
    }

    @GetMapping("/items/{id}/location")
    public ResponseEntity<UbicacionResponse> ubicacionProducto(@PathVariable Integer id) {
        return ResponseEntity.ok(itemService.obtenerUbicacion(id));
    }
}
