package com.subastas.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "catalogos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Catalogo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer identificador;

    @Column(nullable = false, length = 250)
    private String descripcion;

    private Integer subasta;

    private Integer responsable;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subasta", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Subasta subastaEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsable", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Empleado responsableEmpleado;

    @JsonIgnore
    @OneToMany(mappedBy = "catalogoEntity", fetch = FetchType.LAZY)
    private List<ItemCatalogo> items;
}
