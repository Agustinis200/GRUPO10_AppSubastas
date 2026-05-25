package com.subastas.backend.service;

import com.subastas.backend.dto.bids.PujaRequest;
import com.subastas.backend.dto.bids.PujaResponse;
import com.subastas.backend.enums.Categoria;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class PujaService {
    public PujaResponse crearPuja(PujaRequest request) {
        ItemData item = obtenerItemCatalogo(request.getItemCatalogoId());
        PujaResponse ultimaPuja = obtenerUltimaPuja(request.getItemCatalogoId(), item);

        validarMedioPago(request.getAsistenteId());
        validarCategoria(request.getAsistenteId(), item.categoriaSubasta());
        validarImporte(request.getImporte(), ultimaPuja.getImporte(), item.precioBase(), item.categoriaSubasta());

        return registrarPuja(request, ultimaPuja);
    }

    private PujaResponse obtenerUltimaPuja(Integer itemCatalogoId, ItemData item) {
        // En un sistema real, este método consultaría la base de datos.
        // Si no existe ninguna puja, se toma el precio base como referencia.
        // Aquí retornamos un resultado ficticio para validar la lógica.
        if (itemCatalogoId % 2 == 0) {
            return PujaResponse.builder()
                    .identificador(100)
                    .asistenteId(1)
                    .itemCatalogoId(itemCatalogoId)
                    .importe(item.precioBase().doubleValue())
                    .ganador(false)
                    .build();
        }
        return PujaResponse.builder()
                .identificador(0)
                .asistenteId(0)
                .itemCatalogoId(itemCatalogoId)
                .importe(0.0)
                .ganador(false)
                .build();
    }

    private ItemData obtenerItemCatalogo(Integer itemCatalogoId) {
        // En una implementación real debería recuperar el producto y su subasta.
        BigDecimal precioBase = BigDecimal.valueOf(10000);
        return new ItemData(itemCatalogoId, precioBase, Categoria.comun);
    }

    private void validarMedioPago(Integer asistenteId) {
        // Debe existir al menos un medio de pago verificado.
        boolean tieneMedioPagoVerificado = asistenteId != null && asistenteId % 2 != 0;
        if (!tieneMedioPagoVerificado) {
            throw new IllegalArgumentException("El usuario no tiene un medio de pago verificado");
        }
    }

    private void validarCategoria(Integer asistenteId, Categoria categoriaSubasta) {
        Categoria categoriaUsuario = obtenerCategoriaUsuario(asistenteId);
        if (!categoriaUsuario.permiteParticipar(categoriaSubasta)) {
            throw new IllegalArgumentException("La categoría del usuario no permite participar en esta subasta");
        }
    }

    private Categoria obtenerCategoriaUsuario(Integer asistenteId) {
        if (asistenteId == null) {
            return Categoria.comun;
        }
        if (asistenteId % 5 == 0) {
            return Categoria.platino;
        }
        if (asistenteId % 4 == 0) {
            return Categoria.oro;
        }
        if (asistenteId % 3 == 0) {
            return Categoria.plata;
        }
        if (asistenteId % 2 == 0) {
            return Categoria.especial;
        }
        return Categoria.comun;
    }

    private void validarImporte(Double importe, Double importeActual, BigDecimal precioBase, Categoria categoriaSubasta) {
        if (importe == null || importe <= 0) {
            throw new IllegalArgumentException("El importe de la puja debe ser mayor que cero");
        }

        double referencia = Math.max(importeActual != null ? importeActual : 0.0, precioBase.doubleValue());
        if (importe <= referencia) {
            throw new IllegalArgumentException("La puja debe ser mayor a la puja actual");
        }

        if (categoriaSubasta == Categoria.oro || categoriaSubasta == Categoria.platino) {
            return;
        }

        double minimo = referencia + precioBase.doubleValue() * 0.01;
        if (importe < minimo) {
            throw new IllegalArgumentException("La puja debe ser al menos 1% mayor que la mejor oferta actual");
        }

        double maximo = referencia + precioBase.doubleValue() * 0.20;
        if (importe > maximo) {
            throw new IllegalArgumentException("La puja no puede superar el 20% del valor base sobre la mejor oferta actual");
        }
    }

    private PujaResponse registrarPuja(PujaRequest request, PujaResponse ultimaPuja) {
        return PujaResponse.builder()
                .identificador((int) (System.currentTimeMillis() % Integer.MAX_VALUE))
                .asistenteId(request.getAsistenteId())
                .itemCatalogoId(request.getItemCatalogoId())
                .importe(request.getImporte())
                .ganador(false)
                .build();
    }

    private static final class ItemData {
        private final Integer itemCatalogoId;
        private final BigDecimal precioBase;
        private final Categoria categoriaSubasta;

        private ItemData(Integer itemCatalogoId, BigDecimal precioBase, Categoria categoriaSubasta) {
            this.itemCatalogoId = itemCatalogoId;
            this.precioBase = precioBase;
            this.categoriaSubasta = categoriaSubasta;
        }

        public Integer itemCatalogoId() {
            return itemCatalogoId;
        }

        public BigDecimal precioBase() {
            return precioBase;
        }

        public Categoria categoriaSubasta() {
            return categoriaSubasta;
        }
    }
}
