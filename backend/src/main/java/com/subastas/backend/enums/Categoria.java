package com.subastas.backend.enums;

public enum Categoria {
    comun,
    especial,
    plata,
    oro,
    platino;

    public boolean permiteParticipar(Categoria categoriaSubasta) {
        return this.ordinal() >= categoriaSubasta.ordinal();
    }
}
