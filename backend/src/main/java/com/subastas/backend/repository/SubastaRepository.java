package com.subastas.backend.repository;

import com.subastas.backend.entity.Subasta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubastaRepository extends JpaRepository<Subasta, Integer> {
    List<Subasta> findByEstado(String estado);
}
