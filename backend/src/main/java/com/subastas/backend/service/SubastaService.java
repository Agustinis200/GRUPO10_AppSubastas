package com.subastas.backend.service;

import com.subastas.backend.dto.auctions.AsistenteResponse;
import com.subastas.backend.dto.auctions.CatalogoResponse;
import com.subastas.backend.dto.auctions.ItemCatalogoResponse;
import com.subastas.backend.dto.auctions.SubastaResponse;
import com.subastas.backend.dto.common.MessageResponse;
import com.subastas.backend.enums.Categoria;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class SubastaService {
    public List<SubastaResponse> listarSubastas(String estado, Categoria categoria) {
        return Collections.emptyList();
    }

    public SubastaResponse detalleSubasta(Integer id) {
        return SubastaResponse.builder().build();
    }

    public AsistenteResponse ingresarSubasta(Integer id) {
        return AsistenteResponse.builder().build();
    }

    public MessageResponse salirSubasta(Integer id) {
        return MessageResponse.builder().message("Salida de subasta registrada").build();
    }

    public CatalogoResponse obtenerCatalogo(Integer id) {
        return CatalogoResponse.builder().build();
    }

    public List<ItemCatalogoResponse> listarItemsSubasta(Integer id) {
        return Collections.emptyList();
    }
}
