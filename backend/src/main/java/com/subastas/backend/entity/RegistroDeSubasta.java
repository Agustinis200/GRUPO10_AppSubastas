package com.subastas.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "registroDeSubasta")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegistroDeSubasta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer identificador;

    private Integer subasta;

    private Integer duenio;

    private Integer producto;

    private Integer cliente;

    private BigDecimal importe;

    private BigDecimal comision;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subasta", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Subasta subastaEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "duenio", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Duenio duenioEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Producto productoEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Cliente clienteEntity;
}
