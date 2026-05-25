package com.subastas.backend.repository;

import com.subastas.backend.entity.ItemCatalogo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItemCatalogoRepository extends JpaRepository<ItemCatalogo, Integer> {
    List<ItemCatalogo> findByCatalogo(Integer catalogoId);
}
