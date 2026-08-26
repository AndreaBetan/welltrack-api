# WellTrack API

API REST para **WellTrack**, una aplicación web orientada al seguimiento integral de hábitos saludables. El sistema permite registrar alimentación, actividad física, sueño y evolución del peso, consultar estadísticas y generar recomendaciones personalizadas a partir de los hábitos de los últimos siete días completos.

> Proyecto desarrollado como parte de un Trabajo Fin de Máster. WellTrack ofrece información orientativa y no sustituye la evaluación ni las recomendaciones de un profesional sanitario.

## Funcionalidades principales

- Registro, autenticación y edición del perfil del usuario.
- Gestión de objetivos de alimentación, actividad, sueño y peso.
- Búsqueda de alimentos por nombre o código de barras mediante CalorieAPI.
- Registro manual o calculado de calorías y macronutrientes.
- Registro de actividades mediante un catálogo basado en valores MET.
- Registro de horarios, duración, calidad y factores que afectan al sueño.
- Historial de peso y análisis de su evolución.
- Estadísticas resumidas y tendencias por periodo.
- Dashboard diario con índice de bienestar semanal.
- Recomendaciones basadas en reglas y recursos educativos.

## Tecnologías

- Node.js 22
- Express 5
- PostgreSQL
- `node-pg-migrate`
- JSON Web Tokens
- bcrypt
- CalorieAPI

## Arquitectura

El backend utiliza una separación por capas:

```text
HTTP request
    ↓
Routes and authentication middleware
    ↓
Controllers
    ↓
Services and business rules
    ↓
Repositories
    ↓
PostgreSQL
```

Los controladores gestionan HTTP, los servicios contienen las reglas de negocio y los repositorios encapsulan las consultas SQL. Todas las operaciones privadas obtienen el usuario desde el JWT y no aceptan un `user_id` proporcionado por el cliente.

## Requisitos previos

- Node.js 22 o superior.
- npm.
- PostgreSQL con la extensión `pgcrypto` disponible.
- Una clave de acceso de CalorieAPI para utilizar la búsqueda de alimentos.

## Instalación

```bash
git clone https://github.com/AndreaBetan/welltrack-api.git
cd welltrack-api
npm install
```

## Configuración

La configuración local se mantiene en un archivo `.env`. 

Puedes generar un secreto JWT seguro mediante:

```bash
openssl rand -base64 64
```

## Base de datos y migraciones

Ejecuta todas las migraciones pendientes:

```bash
npm run migrate:up
```

Revierte la última migración:

```bash
npm run migrate:down
```

Crea una migración nueva:

```bash
npm run migrate:create -- migration_name
```

Las migraciones permiten reconstruir tablas, restricciones, relaciones, catálogos y reglas de recomendaciones en una base de datos nueva.

## Ejecución

Modo desarrollo:

```bash
npm run dev
```

Modo normal:

```bash
npm start
```

La dirección y el puerto de la API dependen de la configuración local del entorno.

## Autenticación

Las rutas privadas requieren un JWT:

```http
Authorization: Bearer <token>
```

El token contiene el identificador del usuario en el claim estándar `sub`. Su firma, expiración, algoritmo, emisor y audiencia se verifican antes de permitir el acceso.

## Endpoints principales

### Autenticación y perfil

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/auth/register` | Registra un usuario |
| `POST` | `/api/auth/login` | Inicia sesión |
| `GET` | `/api/users/me` | Obtiene el perfil autenticado |
| `PATCH` | `/api/users/me` | Actualiza el perfil |

### Objetivos

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/goals` | Lista los objetivos |
| `POST` | `/api/goals` | Crea un objetivo |
| `PATCH` | `/api/goals/:id` | Actualiza un objetivo |
| `DELETE` | `/api/goals/:id` | Elimina lógicamente un objetivo |
| `GET` | `/api/goals/:goalId/nutrition-distribution` | Consulta la distribución nutricional |
| `PUT` | `/api/goals/:goalId/nutrition-distribution` | Crea o reemplaza la distribución |
| `DELETE` | `/api/goals/:goalId/nutrition-distribution` | Elimina la distribución |

### Alimentación

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/foods/search?q=pollo` | Busca alimentos por nombre |
| `GET` | `/api/foods/:id` | Obtiene el detalle de un alimento |
| `GET` | `/api/foods/barcode/:barcode` | Busca un producto por código de barras |
| `POST` | `/api/foods/calculate` | Calcula nutrientes para una cantidad |
| `GET` | `/api/nutrition` | Consulta registros nutricionales |
| `POST` | `/api/nutrition` | Crea un registro manual |
| `POST` | `/api/nutrition/from-food` | Calcula y guarda un alimento |
| `POST` | `/api/nutrition/from-barcode` | Calcula y guarda un código de barras |
| `PATCH` | `/api/nutrition/:id` | Actualiza un registro manual |
| `PATCH` | `/api/nutrition/from-food/:id` | Recalcula un alimento externo |
| `PATCH` | `/api/nutrition/from-barcode/:id` | Recalcula un código de barras |
| `DELETE` | `/api/nutrition/:id` | Elimina un registro |

### Actividad física

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/activities/types` | Consulta el catálogo de actividades |
| `GET` | `/api/activities` | Consulta el historial |
| `POST` | `/api/activities` | Registra una actividad |
| `PATCH` | `/api/activities/:id` | Actualiza una actividad |
| `DELETE` | `/api/activities/:id` | Elimina una actividad |

### Sueño

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/sleep/factors` | Consulta los factores disponibles |
| `GET` | `/api/sleep` | Consulta el historial de sueño |
| `GET` | `/api/sleep/:id` | Consulta un registro |
| `POST` | `/api/sleep` | Registra el sueño |
| `PATCH` | `/api/sleep/:id` | Actualiza un registro |
| `DELETE` | `/api/sleep/:id` | Elimina un registro |

### Análisis y recomendaciones

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/recommendations` | Genera recomendaciones personalizadas |
| `GET` | `/api/statistics/summary` | Resume un periodo |
| `GET` | `/api/statistics/trends` | Obtiene tendencias temporales |
| `GET` | `/api/dashboard` | Obtiene el resumen diario y el índice de bienestar |
| `GET` | `/api/health` | Comprueba el estado de la API y PostgreSQL |

Los endpoints temporales aceptan los parámetros que correspondan en formato `AAAA-MM-DD`, por ejemplo:

```text
/api/statistics/trends?from=AAAA-MM-DD&to=AAAA-MM-DD
/api/dashboard?date=AAAA-MM-DD
/api/recommendations?date=AAAA-MM-DD
```

## Seguridad

- Contraseñas protegidas con bcrypt.
- Autenticación y autorización mediante JWT.
- Consultas SQL parametrizadas.
- Filtrado de recursos por usuario autenticado.
- CORS limitado a orígenes configurados.
- Cabeceras HTTP defensivas mediante Helmet.
- Rate limiting para autenticación y consultas externas.
- Validación de entradas en la capa de servicios.
- Protección de nutrientes obtenidos desde proveedores externos.
- Transacciones para operaciones que modifican varias tablas.
- Variables sensibles excluidas del repositorio.

## Estructura del proyecto

```text
migrations/             Migraciones de PostgreSQL
scripts/                Utilidades para migraciones
src/
  connectors/           Configuración de PostgreSQL
  db/                   Acceso común y transacciones
  middlewares/          Autenticación, seguridad y errores
  repositories/         Consultas SQL
  routes/               Rutas y controladores HTTP
  services/             Validaciones y reglas de negocio
  utils/                Utilidades compartidas
server.js               Punto de entrada
```
