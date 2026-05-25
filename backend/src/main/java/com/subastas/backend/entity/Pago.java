package com.subastas.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pagos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pago {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer identificador;

    private Integer cliente;

    private Integer medioPago;

    private BigDecimal monto;

    @Column(length = 20)
    private String estado;

    private LocalDateTime fechaPago;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Cliente clienteEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medioPago", referencedColumnName = "identificador", insertable = false, updatable = false)
    private MedioPago medioPagoEntity;
}
