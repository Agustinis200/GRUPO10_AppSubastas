package com.subastas.backend.repository;

import com.subastas.backend.entity.Pujo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PujoRepository extends JpaRepository<Pujo, Integer> {
    List<Pujo> findByItemAndGanador(Integer itemId, Boolean ganador);
    List<Pujo> findByAsistente(Integer asistenteId);
    List<Pujo> findByItem(Integer itemId);
}
