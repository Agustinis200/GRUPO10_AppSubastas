package com.subastas.backend.repository;

import com.subastas.backend.entity.Asistente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AsistenteRepository extends JpaRepository<Asistente, Integer> {
    List<Asistente> findBySubasta(Integer subastaId);
    List<Asistente> findByCliente(Integer clienteId);
}
