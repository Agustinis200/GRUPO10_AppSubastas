package com.subastas.backend.repository;

import com.subastas.backend.entity.SolicitudVenta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SolicitudVentaRepository extends JpaRepository<SolicitudVenta, Integer> {
    List<SolicitudVenta> findByDuenio(Integer duenioId);
    List<SolicitudVenta> findByEstado(String estado);
    List<SolicitudVenta> findByProducto(Integer productoId);
}
