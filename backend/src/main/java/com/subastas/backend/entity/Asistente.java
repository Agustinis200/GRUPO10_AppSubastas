package com.subastas.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "asistentes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Asistente {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer identificador;

    private Integer numeroPostor;

    private Integer cliente;

    private Integer subasta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Cliente clienteEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subasta", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Subasta subastaEntity;

    @JsonIgnore
    @OneToMany(mappedBy = "asistenteEntity", fetch = FetchType.LAZY)
    private List<Pujo> pujos;
}
