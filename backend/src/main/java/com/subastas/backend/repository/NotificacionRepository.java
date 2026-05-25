package com.subastas.backend.repository;

import com.subastas.backend.entity.Notificacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificacionRepository extends JpaRepository<Notificacion, Integer> {
    List<Notificacion> findByCliente(Integer clienteId);
    List<Notificacion> findByClienteAndLeida(Integer clienteId, Boolean leida);
}
