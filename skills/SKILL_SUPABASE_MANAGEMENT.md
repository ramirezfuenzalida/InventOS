# 🗄️ Skill: Supabase Management (InventOS Architecture)

Este protocolo define cómo interactuar con el ecosistema de Supabase en el proyecto **InventOS** para garantizar la integridad de los datos, la seguridad y la sincronización en tiempo real.

## 🛠️ Herramientas Disponibles
- **SQL Execution:** Capacidad para ejecutar consultas complejas y migraciones DDL.
- **RLS Audit:** Verificación constante de Row Level Security para proteger datos sensibles de estudiantes y docentes.
- **Log Analysis:** Monitoreo de errores en tiempo real para depuración proactiva.

## 📋 Esquema de Datos Críticos
- **`inventory`**: Maestro de instrumentos. Campo clave `id` (string) y metadatos JSONB para flexibilidad.
- **`history`**: Registro histórico de préstamos y devoluciones.
- **`students` / `Usuarios`**: Gestión de perfiles. Nota: `Usuarios` contiene roles extendidos (Director, Monitor, etc.).
- **`scan_sessions`**: Control de auditorías de inventario físico.
- **`app_sync`**: Estado de sincronización global de la aplicación.

## 🚦 Protocolos de Operación
1. **Validación de Tipos:** Antes de insertar o actualizar, verificar que los IDs coincidan (UUID vs String).
2. **Seguridad Primero:** Siempre verificar que `RLS` esté habilitado en tablas nuevas. Las políticas deben permitir solo el acceso necesario por rol.
3. **Manejo de Errores:** Implementar siempre bloques try/catch en el cliente y registrar fallos críticos en la tabla de logs si es necesario.
4. **Sincronización:** Priorizar el uso de suscripciones `Realtime` para cambios en el inventario y estados de sesión.

## 💎 Regla de Oro
"La base de datos es la única fuente de verdad. El estado local de la app debe ser un reflejo fiel y optimista de Supabase."

---
*Este skill asegura que InventOS mantenga una base de datos robusta, segura y profesional.*
