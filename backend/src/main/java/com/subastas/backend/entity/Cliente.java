package com.subastas.backend.entity;

import com.subastas.backend.enums.Categoria;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "clientes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cliente {
    @Id
    private Integer identificador;

    private Integer numeroPais;

    private Boolean admitido;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Categoria categoria;

    private Integer verificador;

    @OneToOne
    @JoinColumn(name = "identificador", referencedColumnName = "identificador")
    private Persona persona;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "numeroPais", referencedColumnName = "numero", insertable = false, updatable = false)
    private Pais pais;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verificador", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Empleado verificadorEmpleado;
}
