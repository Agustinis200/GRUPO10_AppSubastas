package com.subastas.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "multas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Multa {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer identificador;

    private Integer cliente;

    @Column(length = 300)
    private String razon;

    private BigDecimal monto;

    @Column(length = 20)
    private String estado;

    private LocalDateTime fechaCreacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Cliente clienteEntity;
}
