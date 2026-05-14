# 🔥 Skill: Firebase Management (Auth & User Sync)

Este protocolo asegura la correcta integración de Firebase dentro de la arquitectura de **InventOS**, principalmente para la gestión de identidad y autenticación.

## 🛠️ Herramientas Disponibles
- **Auth Configuration:** Gestión de métodos de acceso (Email/Password, Google).
- **Environment Update:** Configuración de credenciales y dominios autorizados.
- **Project Setup:** Inicialización de servicios core de Firebase en el directorio del proyecto.

## 📋 Integración con Supabase
- **Hybrid Auth:** Firebase gestiona el inicio de sesión del usuario, mientras que Supabase vincula ese `UID` con el perfil en la tabla `Usuarios`.
- **Sync State:** El estado de autenticación de Firebase debe disparar la carga del perfil correspondiente en Supabase.

## 🚦 Protocolos de Operación
1. **Seguridad de Cliente:** No exponer claves privadas en el código frontend; usar variables de entorno.
2. **Persistencia:** Configurar la persistencia de sesión adecuada para dispositivos móviles (PWA).
3. **Mapeo de Roles:** Al crear un usuario en Firebase, se debe asegurar que se cree la entrada correspondiente en `Usuarios` con el rol predeterminado.

## 💎 Regla de Oro
"Firebase es la llave, Supabase es el cerebro. La llave siempre debe abrir la puerta correcta."

---
*Este skill garantiza una autenticación fluida y segura para todos los integrantes de la orquesta.*
