package com.subastas.backend.repository;

import com.subastas.backend.entity.Catalogo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CatalogoRepository extends JpaRepository<Catalogo, Integer> {
    List<Catalogo> findBySubasta(Integer subastaId);
}
