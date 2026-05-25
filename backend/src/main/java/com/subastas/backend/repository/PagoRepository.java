package com.subastas.backend.repository;

import com.subastas.backend.entity.Pago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PagoRepository extends JpaRepository<Pago, Integer> {
    List<Pago> findByCliente(Integer clienteId);
    List<Pago> findByEstado(String estado);
}
