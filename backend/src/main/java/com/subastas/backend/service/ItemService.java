package com.subastas.backend.service;

import com.subastas.backend.dto.auctions.ItemCatalogoResponse;
import com.subastas.backend.dto.auctions.UbicacionResponse;
import com.subastas.backend.dto.insurance.SeguroResponse;
import com.subastas.backend.dto.bids.PujaResponse;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class ItemService {
    public ItemCatalogoResponse detalleItem(Integer id) {
        return ItemCatalogoResponse.builder().build();
    }

    public List<PujaResponse> historialPujas(Integer id) {
        return Collections.emptyList();
    }

    public PujaResponse pujaActual(Integer id) {
        return PujaResponse.builder().build();
    }

    public SeguroResponse obtenerSeguro(Integer id) {
        return SeguroResponse.builder().build();
    }

    public UbicacionResponse obtenerUbicacion(Integer id) {
        return UbicacionResponse.builder().build();
    }
}
