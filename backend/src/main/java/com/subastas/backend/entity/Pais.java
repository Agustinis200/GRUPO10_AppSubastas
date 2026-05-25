package com.subastas.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "paises")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pais {
    @Id
    private Integer numero;

    @Column(nullable = false, length = 250)
    private String nombre;

    @Column(length = 250)
    private String nombreCorto;

    @Column(nullable = false, length = 250)
    private String capital;

    @Column(nullable = false, length = 250)
    private String nacionalidad;

    @Column(nullable = false, length = 150)
    private String idiomas;

    @JsonIgnore
    @OneToMany(mappedBy = "pais", fetch = FetchType.LAZY)
    private List<Cliente> clientes;
}
