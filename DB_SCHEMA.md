# Esquema de Base de Datos del Backend

Este documento describe todas las tablas de base de datos usadas por el servicio `backend`, basado en `backend/prisma/schema.prisma`.

## Resumen

- Base de datos: PostgreSQL
- ORM: Prisma
- Patrón multi-tenant: todas las tablas de dominio incluyen `tenantId`
- Cantidad de tablas: 7

## Resumen de Relaciones de Entidades

- `tenants` 1:N `users`
- `tenants` 1:N `cameras`
- `tenants` 1:N `events`
- `tenants` 1:N `reviews`
- `tenants` 1:N `availability_logs`
- `tenants` 1:N `frigate_servers`
- `cameras` 1:N `events`
- `cameras` 1:N `reviews`

Todas las claves foráneas están configuradas con `ON DELETE CASCADE`.

## Tablas

### `tenants`

Propósito: registro maestro de tenants para aislamiento de datos multi-tenant.

| Columna | Tipo | Nulo | Por defecto | Notas |
|---|---|---|---|---|
| `id` | `TEXT` | No | generado (`cuid()`) | Clave primaria |
| `name` | `TEXT` | No | - | Nombre visible del tenant |
| `description` | `TEXT` | Sí | - | Descripción opcional |
| `createdAt` | `TIMESTAMP(3)` | No | `CURRENT_TIMESTAMP` | Fecha de creación |

Índices y restricciones:
- Clave primaria: `id`

### `users`

Propósito: cuentas de usuario asociadas a un tenant.

| Columna | Tipo | Nulo | Por defecto | Notas |
|---|---|---|---|---|
| `id` | `TEXT` | No | generado (`cuid()`) | Clave primaria |
| `email` | `TEXT` | No | - | Email único de usuario |
| `password` | `TEXT` | No | - | Hash de contraseña |
| `role` | enum `UserRole` | No | `CLIENT` | `ADMIN` o `CLIENT` |
| `theme` | enum `ThemePreference` | No | `DARK` | Preferencia de tema de UI |
| `tenantId` | `TEXT` | No | - | FK -> `tenants.id` |
| `createdAt` | `TIMESTAMP(3)` | No | `CURRENT_TIMESTAMP` | Fecha de creación |

Índices y restricciones:
- Clave primaria: `id`
- Único: `email`
- Clave foránea: `tenantId` -> `tenants(id)` con borrado en cascada

### `cameras`

Propósito: configuración y registro de cámaras Frigate por tenant.

| Columna | Tipo | Nulo | Por defecto | Notas |
|---|---|---|---|---|
| `id` | `TEXT` | No | generado (`cuid()`) | Clave primaria |
| `tenantId` | `TEXT` | No | - | FK -> `tenants.id` |
| `frigateCameraKey` | `TEXT` | No | - | Identificador de cámara en Frigate |
| `label` | `TEXT` | Sí | - | Nombre amigable |
| `inputUrl` | `TEXT` | Sí | - | URL de entrada de video |
| `isTestFeed` | `BOOLEAN` | No | `false` | Indica si es feed de prueba |
| `inputArgs` | `TEXT` | Sí | - | Argumentos de entrada |
| `roles` | `TEXT` | Sí | - | Roles/uso de stream |
| `recordEnabled` | `BOOLEAN` | No | `true` | Grabación habilitada |
| `snapshotsEnabled` | `BOOLEAN` | No | `true` | Snapshots habilitados |
| `snapshotsRetainDays` | `INTEGER` | No | `10` | Días de retención de snapshots |
| `motionEnabled` | `BOOLEAN` | No | `true` | Detección de movimiento habilitada |
| `detectWidth` | `INTEGER` | No | `320` | Ancho de detección |
| `detectHeight` | `INTEGER` | No | `180` | Alto de detección |
| `detectFps` | `INTEGER` | No | `5` | FPS de detección |
| `zoneName` | `TEXT` | No | `"face"` | Nombre de zona de revisión |
| `zoneCoordinates` | `TEXT` | Sí | - | Coordenadas de zona |
| `zoneObjects` | `TEXT` | Sí | `"person,car,cat,dog"` | Objetos monitoreados en zona |
| `reviewRequiredZones` | `TEXT` | Sí | - | Zonas requeridas para review |
| `ip` | `TEXT` | Sí | - | IP de cámara |
| `port` | `INTEGER` | Sí | - | Puerto de cámara |
| `username` | `TEXT` | Sí | - | Usuario de cámara |
| `password` | `TEXT` | Sí | - | Contraseña de cámara |
| `isEnabled` | `BOOLEAN` | No | `true` | Bandera de habilitación |
| `createdAt` | `TIMESTAMP(3)` | No | `CURRENT_TIMESTAMP` | Fecha de creación |

Índices y restricciones:
- Clave primaria: `id`
- Único compuesto: (`tenantId`, `frigateCameraKey`)
- Clave foránea: `tenantId` -> `tenants(id)` con borrado en cascada

### `events`

Propósito: eventos de detección de Frigate ingeridos.

| Columna | Tipo | Nulo | Por defecto | Notas |
|---|---|---|---|---|
| `id` | `TEXT` | No | generado (`cuid()`) | Clave primaria |
| `tenantId` | `TEXT` | No | - | FK -> `tenants.id` |
| `cameraId` | `TEXT` | No | - | FK -> `cameras.id` |
| `frigateId` | `TEXT` | No | - | ID de evento de Frigate |
| `type` | `TEXT` | No | - | Tipo de evento |
| `label` | `TEXT` | Sí | - | Etiqueta de objeto/sujeto |
| `subLabel` | `TEXT` | Sí | - | Etiqueta secundaria (ej: rostro reconocido) |
| `status` | `TEXT` | No | `"unresolved"` | Estado del flujo |
| `acknowledgedAt` | `TIMESTAMP(3)` | Sí | - | Fecha de reconocimiento |
| `resolvedAt` | `TIMESTAMP(3)` | Sí | - | Fecha de resolución |
| `hasSnapshot` | `BOOLEAN` | No | `false` | Disponibilidad de snapshot |
| `hasClip` | `BOOLEAN` | No | `false` | Disponibilidad de clip |
| `startTime` | `DOUBLE PRECISION` | Sí | - | Tiempo inicial del evento en origen |
| `endTime` | `DOUBLE PRECISION` | Sí | - | Tiempo final del evento en origen |
| `rawPayload` | `JSONB` | No | - | Payload completo de origen |
| `createdAt` | `TIMESTAMP(3)` | No | `CURRENT_TIMESTAMP` | Fecha de creación |

Índices y restricciones:
- Clave primaria: `id`
- Único compuesto: (`tenantId`, `frigateId`)
- Índice: (`tenantId`)
- Índice: (`cameraId`)
- Índice: (`createdAt`)
- Clave foránea: `tenantId` -> `tenants(id)` con borrado en cascada
- Clave foránea: `cameraId` -> `cameras(id)` con borrado en cascada

### `reviews`

Propósito: mensajes de revisión asociados a cámaras.

| Columna | Tipo | Nulo | Por defecto | Notas |
|---|---|---|---|---|
| `id` | `TEXT` | No | generado (`cuid()`) | Clave primaria |
| `tenantId` | `TEXT` | No | - | FK -> `tenants.id` |
| `cameraId` | `TEXT` | No | - | FK -> `cameras.id` |
| `reviewId` | `TEXT` | No | - | Identificador de revisión en origen |
| `cameraName` | `TEXT` | No | - | Nombre de cámara en el mensaje de origen |
| `severity` | `TEXT` | No | - | Clasificación de severidad |
| `retracted` | `BOOLEAN` | No | `false` | Bandera de retracción |
| `timestamp` | `TIMESTAMP(3)` | Sí | - | Marca de tiempo de origen |
| `rawPayload` | `JSONB` | No | - | Payload completo de origen |
| `createdAt` | `TIMESTAMP(3)` | No | `CURRENT_TIMESTAMP` | Fecha de creación |

Índices y restricciones:
- Clave primaria: `id`
- Único compuesto: (`tenantId`, `reviewId`)
- Índice: (`tenantId`)
- Índice: (`cameraId`)
- Índice: (`createdAt`)
- Clave foránea: `tenantId` -> `tenants(id)` con borrado en cascada
- Clave foránea: `cameraId` -> `cameras(id)` con borrado en cascada

### `availability_logs`

Propósito: mensajes de estado de disponibilidad de cámara/sistema.

| Columna | Tipo | Nulo | Por defecto | Notas |
|---|---|---|---|---|
| `id` | `TEXT` | No | generado (`cuid()`) | Clave primaria |
| `tenantId` | `TEXT` | No | - | FK -> `tenants.id` |
| `available` | `BOOLEAN` | No | - | Estado de disponibilidad |
| `timestamp` | `TIMESTAMP(3)` | No | - | Marca de tiempo de origen |
| `rawPayload` | `JSONB` | No | - | Payload completo de origen |
| `createdAt` | `TIMESTAMP(3)` | No | `CURRENT_TIMESTAMP` | Fecha de creación |

Índices y restricciones:
- Clave primaria: `id`
- Índice: (`tenantId`)
- Índice: (`createdAt`)
- Clave foránea: `tenantId` -> `tenants(id)` con borrado en cascada

### `frigate_servers`

Propósito: configuración de servidores Frigate por tenant.

| Columna | Tipo | Nulo | Por defecto | Notas |
|---|---|---|---|---|
| `id` | `TEXT` | No | generado (`cuid()`) | Clave primaria |
| `tenantId` | `TEXT` | No | - | FK -> `tenants.id` |
| `name` | `TEXT` | No | - | Nombre lógico del servidor |
| `baseUrl` | `TEXT` | No | - | URL base del servidor Frigate |
| `authType` | `TEXT` | No | `"none"` | `none`, `token` o `login` |
| `username` | `TEXT` | Sí | - | Usuario de autenticación |
| `password` | `TEXT` | Sí | - | Contraseña de autenticación |
| `token` | `TEXT` | Sí | - | Token de autenticación |
| `configPath` | `TEXT` | Sí | - | Ruta de configuración remota |
| `verifyTls` | `BOOLEAN` | No | `true` | Verificación TLS habilitada |
| `isEnabled` | `BOOLEAN` | No | `true` | Servidor habilitado |
| `isDefault` | `BOOLEAN` | No | `false` | Servidor por defecto del tenant |
| `createdAt` | `TIMESTAMP(3)` | No | `CURRENT_TIMESTAMP` | Fecha de creación |
| `updatedAt` | `TIMESTAMP(3)` | No | automático (`@updatedAt`) | Última actualización |

Índices y restricciones:
- Clave primaria: `id`
- Único compuesto: (`tenantId`, `name`)
- Índice: (`tenantId`)
- Clave foránea: `tenantId` -> `tenants(id)` con borrado en cascada

## Enums de Prisma

### `UserRole`

- `ADMIN`
- `CLIENT`

### `ThemePreference`

- `DARK`
- `LIGHT`

## Notas

- El archivo de esquema (`backend/prisma/schema.prisma`) es la fuente de verdad para las definiciones actuales del modelo.
- Los archivos SQL de migraciones muestran la evolución del esquema, pero para documentación actual se toma como referencia el esquema Prisma vigente.
