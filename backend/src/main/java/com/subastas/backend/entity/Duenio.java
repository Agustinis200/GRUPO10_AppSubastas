package com.subastas.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "duenios")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Duenio {
    @Id
    private Integer identificador;

    private Integer numeroPais;

    private Boolean verificacionFinanciera;

    private Boolean verificacionJudicial;

    private Integer calificacionRiesgo;

    private Integer verificador;

    @OneToOne
    @JoinColumn(name = "identificador", referencedColumnName = "identificador")
    private Persona persona;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verificador", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Empleado verificadorEmpleado;
}
