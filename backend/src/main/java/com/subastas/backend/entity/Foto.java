package com.subastas.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "fotos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Foto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer identificador;

    private Integer producto;

    @Lob
    @Column(nullable = false)
    private byte[] foto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Producto productoEntity;
}
