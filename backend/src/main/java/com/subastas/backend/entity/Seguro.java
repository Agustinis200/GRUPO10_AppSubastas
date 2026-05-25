package com.subastas.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "seguros")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Seguro {
    @Id
    @Column(length = 30)
    private String nroPoliza;

    @Column(nullable = false, length = 150)
    private String compania;

    private Boolean polizaCombinada;

    private BigDecimal importe;
}
