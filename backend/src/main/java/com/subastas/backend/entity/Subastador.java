package com.subastas.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "subastadores")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Subastador {
    @Id
    private Integer identificador;

    @Column(length = 15)
    private String matricula;

    @Column(length = 50)
    private String region;

    @OneToOne
    @JoinColumn(name = "identificador", referencedColumnName = "identificador")
    private Persona persona;
}
