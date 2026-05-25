package com.subastas.backend.service;

import com.subastas.backend.dto.common.MessageResponse;
import com.subastas.backend.dto.payment.PaymentRequest;
import com.subastas.backend.dto.payment.PagoResponse;
import org.springframework.stereotype.Service;

@Service
public class PagoService {
    public PagoResponse generarPago(PaymentRequest request) {
        return PagoResponse.builder().build();
    }

    public MessageResponse confirmarPago(Integer id) {
        return MessageResponse.builder().message("Pago confirmado").build();
    }
}
