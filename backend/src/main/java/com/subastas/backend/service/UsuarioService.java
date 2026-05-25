package com.subastas.backend.service;

import com.subastas.backend.dto.bids.PujaResponse;
import com.subastas.backend.dto.common.MessageResponse;
import com.subastas.backend.dto.sell.SolicitudVentaResponse;
import com.subastas.backend.dto.users.PreRegistroRequest;
import com.subastas.backend.dto.users.RegistroCompletoRequest;
import com.subastas.backend.dto.users.UsuarioResponse;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class UsuarioService {
    public MessageResponse preRegistro(PreRegistroRequest request) {
        return MessageResponse.builder().message("Solicitud de pre-registro recibida").build();
    }

    public MessageResponse completarRegistro(RegistroCompletoRequest request) {
        return MessageResponse.builder().message("Registro completado").build();
    }

    public UsuarioResponse obtenerPerfil() {
        return UsuarioResponse.builder().build();
    }

    public List<PujaResponse> obtenerMisPujas() {
        return Collections.emptyList();
    }
}
