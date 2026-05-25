package com.subastas.backend.entity;

import com.subastas.backend.enums.Categoria;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Entity
@Table(name = "subastas")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Subasta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer identificador;

    private LocalDate fecha;

    private LocalTime hora;

    @Column(length = 10)
    private String estado;

    private Integer subastador;

    @Column(length = 350)
    private String ubicacion;

    private Integer capacidadAsistentes;

    @Column(length = 2)
    private String tieneDeposito;

    @Column(length = 2)
    private String seguridadPropia;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Categoria categoria;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subastador", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Subastador subastadorEntity;

    @OneToMany(mappedBy = "subasta", fetch = FetchType.LAZY)
    private List<Catalogo> catalogos;

    @OneToMany(mappedBy = "subasta", fetch = FetchType.LAZY)
    private List<Asistente> asistentes;

    @OneToMany(mappedBy = "subasta", fetch = FetchType.LAZY)
    private List<RegistroDeSubasta> registros;
}
