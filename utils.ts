import { InventoryItem } from './types.ts';

export const globalNormalize = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    return String(val)
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
    
    // Cuerdas Frotadas
    if (s.includes('violin') || s.includes('viola')) return 'CUERDAS VIOLINES Y VIOLAS';
    if (s.includes('cello') || s.includes('contrabajo') || s.includes('violoncell') || s.includes('violonchel')) return 'CUERDAS CELLOS Y CONTRABAJOS';
    
    // Vientos
    if (s.includes('corno') || s.includes('trompeta') || s.includes('trombon') || s.includes('tuba') || s.includes('eufonio') || s.includes('bugle')) return 'VIENTOS BRONCE';
    if (s.includes('clarinete') || s.includes('flauta') || s.includes('oboe') || s.includes('fagot') || s.includes('piccolo') || s.includes('saxo')) return 'VIENTOS MADERA';
    
    // Percusión
    if (s.includes('percusion') || s.includes('timpani') || s.includes('bateria') || s.includes('bombo') || s.includes('tambor') || s.includes('xilofono') || s.includes('metalofono') || s.includes('glockenspiel') || s.includes('platillo')) return 'PERCUSIÓN';
    
    // Otros / Teclados
    if (s.includes('piano') || s.includes('teclado') || s.includes('acordeon')) return 'TECLADOS Y OTROS';
    
    return 'OTROS';
};

/**
 * Verifica si un instrumento se considera "Prestado" (fuera de sala).
 * Es resiliente: si tiene un estudiante asignado, se considera prestado 
 * a menos que explícitamente se marque como No Prestado o Disponible.
 */
export const isItemLoaned = (item: Partial<InventoryItem> | null | undefined): boolean => {
    if (!item) return false;
    
    const prestado = globalNormalize(item.Prestado || "");
    const ubicacion = globalNormalize(item.Ubicacion || "");
    
    // Solo se considera prestado si explícitamente dice SÍ o HOGAR
    return prestado === 'si' || ubicacion === 'hogar';
};

/**
 * Calcula la distancia de Levenshtein entre dos cadenas para medir su similitud.
 */
export const getLevenshteinDistance = (a: string, b: string): number => {
    const tmp = [];
    for (let i = 0; i <= a.length; i++) {
        tmp[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
        tmp[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            tmp[i][j] = Math.min(
                tmp[i - 1][j] + 1,
                tmp[i][j - 1] + 1,
                tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
    }
    return tmp[a.length][b.length];
};

/**
 * Limpia y normaliza un nombre para comparación inteligente.
 * Elimina paréntesis y números (como "(1)", "(2)"), acentos, puntuación y espacios extras.
 */
export const cleanNameForMatching = (name: string): string => {
    let cleaned = String(name || '').toUpperCase();
    // Eliminar contenido en paréntesis y números sueltos (como "Yecid Soto (1)" o "Yecid Soto 2")
    cleaned = cleaned.replace(/\([^)]*\)/g, "");
    cleaned = cleaned.replace(/\b[0-9]+\b/g, "");
    // Quitar acentos
    cleaned = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Quedarse solo con letras y espacios
    cleaned = cleaned.replace(/[^A-Z ]/g, " ");
    // Colapsar espacios múltiples
    cleaned = cleaned.replace(/\s+/g, " ");
    return cleaned.trim();
};

/**
 * Compara si dos palabras son lo suficientemente similares considerando errores tipográficos.
 */
export const areWordsSimilar = (w1: string, w2: string): boolean => {
    if (w1 === w2) return true;
    if (Math.abs(w1.length - w2.length) > 2) return false;
    return getLevenshteinDistance(w1, w2) <= 2;
};

/**
 * Busca e identifica de forma inteligente si un nombre proviene de un listado oficial de estudiantes.
 * Soporta abreviaturas, acentos ausentes, nombres incompletos, sufijos e imprecisiones de teclado.
 */
export const findOfficialStudentName = (rawName: string, officialNames: string[]): string => {
    const cleanedRaw = cleanNameForMatching(rawName);
    if (!cleanedRaw || cleanedRaw === "DISPONIBLE" || cleanedRaw === "NO DISPONIBLE") return rawName;

    const rawWords = cleanedRaw.split(" ");

    // 1. Coincidencia exacta de nombres limpios
    for (const official of officialNames) {
        if (cleanedRaw === cleanNameForMatching(official)) {
            return official;
        }
    }

    // 2. Coincidencia por subconjunto (una es prefijo/sufijo de la otra con alta confianza)
    let bestMatch: string | null = null;
    let maxMatchedWords = 0;

    for (const official of officialNames) {
        const cleanedOfficial = cleanNameForMatching(official);
        const officialWords = cleanedOfficial.split(" ");

        const matchingWords = rawWords.filter(w => officialWords.includes(w)).length;
        const isSubset = rawWords.every(w => officialWords.includes(w)) || officialWords.every(w => rawWords.includes(w));

        if (isSubset && matchingWords >= 2) {
            if (matchingWords > maxMatchedWords) {
                maxMatchedWords = matchingWords;
                bestMatch = official;
            }
        }
    }

    if (bestMatch) return bestMatch;

    // 3. Coincidencia de las primeras dos palabras con tolerancia de faltas ortográficas (ej: Gabriela Muñoz -> Gabriella Muñoz Cornejo)
    for (const official of officialNames) {
        const cleanedOfficial = cleanNameForMatching(official);
        const officialWords = cleanedOfficial.split(" ");

        if (rawWords.length >= 2 && officialWords.length >= 2) {
            if (areWordsSimilar(rawWords[0], officialWords[0]) && areWordsSimilar(rawWords[1], officialWords[1])) {
                return official;
            }
        }
    }

    // 4. Coincidencia de una sola palabra al inicio (ej: Renatta -> Renatta Santander)
    if (rawWords.length === 1) {
        for (const official of officialNames) {
            const cleanedOfficial = cleanNameForMatching(official);
            const officialWords = cleanedOfficial.split(" ");
            if (officialWords.length > 0 && rawWords[0] === officialWords[0]) {
                return official;
            }
        }
    }

    return rawName;
};
