# 🧠 Skill: Protocolo de Verificación Senior (Playwright)

Este protocolo es de ejecución **OBLIGATORIA** antes de entregar cualquier cambio crítico en la interfaz de usuario de InventOS.

## Objetivos
- Garantizar que las operaciones de inventario (Préstamo, Retorno, Edición) sean funcionales.
- Verificar que las URLs y metadatos se sincronicen correctamente con Supabase.
- Prevenir regresiones en la navegación y visualización de datos (tablas, KPI).

## Checklist de Verificación (Pre-Entrega)
1. [ ] **Análisis Estático**: Verificar limpieza de código y ausencia de errores de lint.
2. [ ] **Validación de Tipos**: Asegurar que las interfaces en `types.ts` coincidan con el esquema de la DB.
3. [ ] **Test de Navegador**: Si aplica, ejecutar pruebas de integración para validar la presencia de elementos críticos.
4. [ ] **Captura Visual**: Validar que el diseño se mantenga premium en resoluciones Desktop y Mobile.
5. [ ] **Consistencia de Datos**: Realizar una operación de prueba y verificar el cambio inmediato en la tabla de Supabase.

## Regla de Oro
"Un error en producción es una falla en el protocolo de verificación. Si no se probó, no existe."

---
*Este skill asegura que InventOS mantenga un estándar de calidad senior y profesional.*
