# 🤖 Skill: Inteligencia de Inventario (Auto-Categorización)

Este protocolo permite que **InventOS** aprenda de los datos históricos y automatice la organización del inventario, eliminando errores humanos durante la carga masiva y el registro manual.

## 🛠️ Herramientas de Inteligencia
- **Semantic Mapping:** Algoritmo para vincular nombres coloquiales de instrumentos (ej: "Chelo") con categorías oficiales ("CUERDAS CELLOS Y CONTRABAJOS").
- **Monitor Auto-Assignment:** Lógica para asignar automáticamente el monitor responsable basándose en la familia del instrumento y la sede.
- **Normalization Engine:** Transformación automática de estados ambiguos (ej: "Más o menos", "En ajuste") a categorías estandarizadas (REGULAR).

## 📋 Reglas de Categorización Pro
- **Cuerdas:** Si incluye "Viol", "Viola", "Cello", "Bajo", "Arpa".
- **Vientos Madera:** Si incluye "Flauta", "Clar", "Oboe", "Fag", "Sax".
- **Vientos Bronce:** Si incluye "Tromp", "Corn", "Tromb", "Tuba".
- **Percusión:** Si incluye "Timpan", "Bom", "Plat", "Caj", "Baqu".

## 🚦 Protocolos de Operación
1. **Validación Pre-Upload:** Antes de insertar datos desde un Excel, pasar cada fila por el motor de inferencia para llenar campos vacíos (Familia, Monitor).
2. **Conflict Resolution:** Si un instrumento tiene una categoría que no corresponde a su nombre (ej: "Violín" en "Bronces"), marcar para revisión manual.
3. **Smart Defaults:** Si la ubicación está vacía, inferir "SALA DE MÚSICA" por defecto, a menos que haya un estudiante asignado.

## 💎 Regla de Oro
"Un inventario desordenado es solo una lista. Un inventario categorizado es una herramienta de gestión estratégica."

---
*Este skill permite que InventOS 'entienda' qué es lo que está guardando, no solo que lo almacene.*
