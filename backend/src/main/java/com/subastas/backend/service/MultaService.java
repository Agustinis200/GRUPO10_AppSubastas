package com.subastas.backend.service;

import com.subastas.backend.dto.common.MessageResponse;
import com.subastas.backend.dto.penalties.MultaResponse;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class MultaService {
    public List<MultaResponse> listarMultas() {
        return Collections.emptyList();
    }

    public MessageResponse pagarMulta(Integer id) {
        return MessageResponse.builder().message("Multa pagada").build();
    }
}
