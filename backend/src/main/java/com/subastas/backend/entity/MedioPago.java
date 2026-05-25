package com.subastas.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "mediosPago")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedioPago {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer identificador;

    private Integer cliente;

    @Column(length = 50)
    private String tipoMedio;

    @Column(length = 100)
    private String detallesCuenta;

    private Boolean verificado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente", referencedColumnName = "identificador", insertable = false, updatable = false)
    private Cliente clienteEntity;

    @JsonIgnore
    @OneToMany(mappedBy = "medioPagoEntity", fetch = FetchType.LAZY)
    private List<Pago> pagos;
}
