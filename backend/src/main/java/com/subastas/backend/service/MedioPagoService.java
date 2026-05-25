package com.subastas.backend.service;

import com.subastas.backend.dto.common.MessageResponse;
import com.subastas.backend.dto.payment.MedioPagoRequest;
import com.subastas.backend.dto.payment.MedioPagoResponse;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class MedioPagoService {
    public List<MedioPagoResponse> listarMedios() {
        return Collections.emptyList();
    }

    public MedioPagoResponse registrarMedio(MedioPagoRequest request) {
        return MedioPagoResponse.builder().build();
    }

    public MessageResponse eliminarMedio(Integer id) {
        return MessageResponse.builder().message("Medio de pago eliminado").build();
    }
}
