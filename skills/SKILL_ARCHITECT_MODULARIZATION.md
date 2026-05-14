# 🏛 Skill: Arquitectura y Modularización Senior

Este protocolo define cómo debe evolucionar InventOS para ser una aplicación modular de nivel profesional.

## Estándares de Organización
- **`/components`**: Carpeta para componentes visuales reutilizables.
- **`/utils`**: Funciones puras de lógica (formateo, fechas).
- **`/types.ts`**: Definiciones de TypeScript centralizadas.
- **`/apiConfig.ts`**: Configuración de puntos de acceso y servicios.

## Protocolo de Refactorización
1. **Extracción Directa**: Identificar bloques de código de más de 50 líneas que realicen una tarea específica.
2. **Desacoplamiento**: El componente extraído debe recibir sus datos por `props`.
3. **Validación**: Cada vez que se mueva una lógica a un archivo externo, se debe verificar la integridad del flujo principal.

## Regla de Oro
"Si un archivo supera las 500 líneas (como App.tsx), es candidato obligatorio a modularización progresiva."

---
*Este skill asegura que InventOS sea mantenible, escalable y digna de una arquitectura Senior.*
