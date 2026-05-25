package com.subastas.backend.repository;

import com.subastas.backend.entity.Subastador;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SubastadorRepository extends JpaRepository<Subastador, Integer> {
}
