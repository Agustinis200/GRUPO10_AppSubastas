package com.subastas.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "solicitudesVenta")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SolicitudVenta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer identificador;

    private Integer duenio;

    private Integer producto;

    @Column(length = 20)
    private String estado;

    private LocalDateTime fechaSolicitud;

    private BigDecimal precioBase;

    private Boolean declaracionPropiedad;

    private Boolean aceptaDevolucionConCargo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "duenio", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Duenio duenioEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Producto productoEntity;
}
