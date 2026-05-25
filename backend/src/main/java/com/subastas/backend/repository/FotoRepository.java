package com.subastas.backend.repository;

import com.subastas.backend.entity.Foto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FotoRepository extends JpaRepository<Foto, Integer> {
    List<Foto> findByProducto(Integer productoId);
}
