package com.subastas.backend.repository;

import com.subastas.backend.entity.MedioPago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedioPagoRepository extends JpaRepository<MedioPago, Integer> {
    List<MedioPago> findByCliente(Integer clienteId);
    List<MedioPago> findByClienteAndVerificado(Integer clienteId, Boolean verificado);
}
