package com.subastas.backend.repository;

import com.subastas.backend.entity.Multa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MultaRepository extends JpaRepository<Multa, Integer> {
    List<Multa> findByCliente(Integer clienteId);
    List<Multa> findByEstado(String estado);
}
