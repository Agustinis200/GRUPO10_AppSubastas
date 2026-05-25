package com.subastas.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "pujos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pujo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer identificador;

    private Integer asistente;

    private Integer item;

    private BigDecimal importe;

    private Boolean ganador;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asistente", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Asistente asistenteEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item", referencedColumnName = "identificador", insertable = false, updatable = false)
    private ItemCatalogo itemEntity;
}
