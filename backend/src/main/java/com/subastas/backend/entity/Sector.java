package com.subastas.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "sectores")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sector {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer identificador;

    @Column(nullable = false, length = 150)
    private String nombreSector;

    @Column(length = 10)
    private String codigoSector;

    private Integer responsableSector;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsableSector", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Empleado responsable;
}
