package com.subastas.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "empleados")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Empleado {
    @Id
    private Integer identificador;

    @Column(length = 100)
    private String cargo;

    private Integer sector;

    @OneToOne
    @JoinColumn(name = "identificador", referencedColumnName = "identificador")
    private Persona persona;

    @JsonIgnore
    @OneToMany(mappedBy = "responsable", fetch = FetchType.LAZY)
    private List<Sector> sectoresResponsables;

    @JsonIgnore
    @OneToMany(mappedBy = "verificadorEmpleado", fetch = FetchType.LAZY)
    private List<Cliente> clientesVerificados;

    @JsonIgnore
    @OneToMany(mappedBy = "verificadorEmpleado", fetch = FetchType.LAZY)
    private List<Duenio> dueniosVerificados;

    @JsonIgnore
    @OneToMany(mappedBy = "revisorEmpleado", fetch = FetchType.LAZY)
    private List<Producto> productosRevisados;

    @JsonIgnore
    @OneToMany(mappedBy = "responsableEmpleado", fetch = FetchType.LAZY)
    private List<Catalogo> catalogosResponsables;
}
