package com.subastas.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Entity
@Table(name = "itemsCatalogo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemCatalogo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer identificador;

    private Integer catalogo;

    private Integer producto;

    private BigDecimal precioBase;

    private BigDecimal comision;

    private Boolean subastado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "catalogo", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Catalogo catalogoEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Producto productoEntity;

    @JsonIgnore
    @OneToMany(mappedBy = "itemEntity", fetch = FetchType.LAZY)
    private List<Pujo> pujos;
}
