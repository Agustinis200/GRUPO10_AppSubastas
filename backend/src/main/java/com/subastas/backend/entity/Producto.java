package com.subastas.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "productos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Producto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer identificador;

    private LocalDate fecha;

    private Boolean disponible;

    @Column(length = 500)
    private String descripcionCatalogo;

    @Column(nullable = false, length = 300)
    private String descripcionCompleta;

    private Integer revisor;

    private Integer duenio;

    @Column(length = 30)
    private String seguro;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "revisor", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Empleado revisorEmpleado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "duenio", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Duenio duenioEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seguro", referencedColumnName = "nroPoliza", insertable = false, updatable = false)
    private Seguro seguroEntity;

    @JsonIgnore
    @OneToMany(mappedBy = "productoEntity", fetch = FetchType.LAZY)
    private List<Foto> fotos;

    @JsonIgnore
    @OneToMany(mappedBy = "productoEntity", fetch = FetchType.LAZY)
    private List<ItemCatalogo> itemsCatalogo;

    @JsonIgnore
    @OneToMany(mappedBy = "productoEntity", fetch = FetchType.LAZY)
    private List<RegistroDeSubasta> registros;
}
