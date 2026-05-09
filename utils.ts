
export const globalNormalize = (val: any): string => {
    if (val === null || val === undefined) return "";
    return val.toString()
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ");
};

export const getEstadoCategoria = (val: string): 'BUENO' | 'REGULAR' | 'MALO' => {
    const s = globalNormalize(val);
    if (s.includes('bueno') || s.includes('excelente') || s.includes('bien') || s.includes('optimo') || s.includes('nuevo')) return 'BUENO';
    if (s.includes('malo') || s.includes('reparacion') || s.includes('danado') || s.includes('roto') || s.includes('mal')) return 'MALO';
    if (s.includes('regular') || s.includes('ajuste') || s.includes('mantencion')) return 'REGULAR';
    return 'BUENO';
};

export const inferFamilia = (instrumento: string): string => {
    const s = globalNormalize(instrumento);
    if (s.includes('violin') || s.includes('viola')) return 'VIOLINES Y VIOLAS';
    if (s.includes('cello') || s.includes('contrabajo') || s.includes('violoncell')) return 'CELLOS Y CONTRABAJOS';
    if (s.includes('corno') || s.includes('trompeta') || s.includes('trombon') || s.includes('tuba') || s.includes('eufonio')) return 'VIENTOS BRONCE';
    if (s.includes('clarinete') || s.includes('flauta') || s.includes('oboe') || s.includes('fagot') || s.includes('piccolo')) return 'VIENTOS MADERA';
    if (s.includes('percusion') || s.includes('timpani') || s.includes('bateria') || s.includes('bombo') || s.includes('tambor') || s.includes('xilofono')) return 'PERCUSIÓN';
    return 'OTROS';
};


/**
 * Verifica si un instrumento se considera "Prestado" (fuera de sala).
 * Es resiliente: si tiene un estudiante asignado, se considera prestado 
 * a menos que explícitamente se marque como No Prestado o Disponible.
 */
export const isItemLoaned = (item: any): boolean => {
    if (!item) return false;
    
    const prestado = globalNormalize(item.Prestado || "");
    const ubicacion = globalNormalize(item.Ubicacion || "");
    
    // Solo se considera prestado si explícitamente dice SÍ o HOGAR
    return prestado === 'si' || ubicacion === 'hogar';
};
