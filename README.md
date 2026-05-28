# 🎻 Sistema de Inventario - Orquesta Sinfónica W.T. (OSWT)

¡Bienvenido al sistema oficial de gestión de inventario y control de préstamos de la **Orquesta Sinfónica W.T.**. Esta aplicación ha sido diseñada y construida con los más altos estándares profesionales para asegurar un control absoluto, seguro y estético sobre los instrumentos y recursos de la orquesta.

---

## 🚀 Arquitectura Tecnológica

El sistema está cimentado en un ecosistema robusto, responsivo e interactivo:

* **Frontend**: [React 19](https://react.dev/), [Vite](https://vite.dev/), y [TypeScript](https://www.typescriptlang.org/) para un tipado estricto y un entorno de desarrollo ultra-rápido.
* **Estilos**: CSS nativo y modular de alta gama con transiciones fluidas, gradients, temas oscuros y un diseño adaptativo premium enfocado en la experiencia de usuario móvil y de escritorio.
* **Gestión de Estado y Sincronización**: [TanStack React Query (v5)](https://tanstack.com/query/latest) para caché asíncrona inteligente, sincronización automática en tiempo real mediante WebSockets y reversiones (*rollbacks*) optimistas ante fallos de red.
* **Base de Datos & Auth**: [Supabase](https://supabase.com/) (PostgreSQL) para almacenamiento relacional blindado, políticas de seguridad a nivel de fila (RLS) y notificaciones de cambios en tiempo real.

---

## 🔒 Arquitectura de Seguridad & RLS (Row-Level Security)

Para garantizar la seguridad de la información sin sacrificar la agilidad en dispositivos móviles mediante códigos QR, el sistema implementa un modelo de **doble capa de seguridad**:

1. **Políticas RLS Activas**:
   * Todas las tablas de la base de datos tienen activado **Row-Level Security (RLS)**.
   * Los datos son legibles de manera pública (`anon`), pero la escritura directa a través del cliente Supabase JS (`INSERT`, `UPDATE`, `DELETE`) está estrictamente restringida a usuarios autenticados (administradores).

2. **Funciones RPC Seguras (`SECURITY DEFINER`)**:
   * Las operaciones del formulario y escaneo QR que realizan estudiantes anónimos se canalizan de forma segura mediante **Procedimientos Almacenados (RPC)** con la cláusula `SECURITY DEFINER`.
   * Estas funciones se ejecutan bajo los privilegios del superusuario `postgres`, permitiendo actualizar el estado de los instrumentos y registrar el historial exclusivamente a través de los flujos de negocio validados, neutralizando cualquier intento de manipulación maliciosa de datos.

---

## 📋 Reglas de Negocio Clave & Transacciones Atómicas

Para asegurar que el sistema no falle jamás y mantenga una consistencia perfecta, se han implementado dos pilares de negocio críticos:

### A. Sincronización de Datos Excel Atómica (`rpc_sync_inventory`)
La carga de planillas de inventario Excel se realiza de manera **atómica y transaccional**:
* Todo el procesamiento de borrado del inventario anterior e inserción de los 98+ nuevos instrumentos se delega en una sola transacción en el servidor Supabase.
* **Protección contra Inconsistencias (Rollback)**: Si una fila de la planilla contiene datos corruptos, campos demasiado largos o formatos erróneos, la base de datos revierte automáticamente todo el proceso (`ROLLBACK`). El inventario anterior se conserva perfectamente intacto y la aplicación jamás se queda vacía.

### B. Restricción de Préstamo Activo ("Retorno Obligatorio")
Un estudiante **no puede retirar un nuevo instrumento** si actualmente posee otro instrumento bajo préstamo activo. Esta regla está doblemente blindada:
* **En Base de Datos (PostgreSQL)**: La función `rpc_checkout_instrument` verifica si existe algún registro en la tabla `inventory` donde el estudiante figure con `"Prestado" = 'SÍ'`. De ser así, aborta la transacción y retorna un error explícito.
* **En Interfaz (React)**: El componente `StudentCheckOut.tsx` detecta el estado del alumno, resalta su perfil en color ámbar con el badge `⚠️ DEBE DEVOLVER PRIMERO`, bloquea el formulario de salida y despliega una pantalla interactiva con el detalle de su instrumento actual, ofreciendo un botón de acceso directo para realizar la devolución de forma automática en un solo clic.

---

## 💻 Desarrollo y Despliegue

### Requisitos Previos
* [Node.js](https://nodejs.org/) (versión 18 o superior recomendada)
* Cuenta e identificador de proyecto Supabase.

### Instrucciones de Ejecución Local

1. **Instalar Dependencias**:
   ```bash
   npm install
   ```

2. **Configurar Variables de Entorno**:
   Crea o edita tu archivo `.env.local` en la raíz del proyecto y define las credenciales de Supabase:
   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_anon_key
   ```

3. **Iniciar Servidores de Desarrollo**:
   ```bash
   npm run dev
   ```
   *Esto iniciará concurrentemente el servidor local de Vite en el puerto `3000` y la base de datos de pruebas simulada.*

4. **Compilar para Producción**:
   ```bash
   npm run build
   ```
   *Este comando valida y transpila todo el código TypeScript a archivos optimizados y listos para producción en la carpeta `/dist`.*

### Despliegue
Cualquier cambio empujado a la rama `main` del repositorio se compila y despliega de manera inmediata a producción a través de la integración continua con **Vercel**.

---

*Diseñado con dedicación y excelencia para la Orquesta Sinfónica W.T.*
