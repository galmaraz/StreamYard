# WebLive2026 Backend

Backend NestJS para la plataforma de videoconferencias y transmisiones en vivo.

## Requisitos

- Node.js 20 o superior
- npm

## Instalacion

```bash
npm install
```
crear un archivo .env para las varibles de entorno

Variables iniciales:

```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:4200
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=weblive2026
DATABASE_USER=weblive
DATABASE_PASSWORD=weblive_dev_password
DATABASE_SSL=false
```

## Comandos

```bash
npm run start:dev
```

Levanta el backend en modo desarrollo.

```bash
npm run build
```

Compila el proyecto.

```bash
npm test
```

Ejecuta pruebas unitarias.

## Base de datos local

Desde la raiz del repositorio:

```bash
docker compose up -d postgres
```

PostgreSQL quedara disponible en:

```text
localhost:5432
```

Credenciales por defecto:

```text
database: weblive2026
user: weblive
password: weblive_dev_password
```

## Endpoint inicial

```http
GET /health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "weblive2026-backend",
  "timestamp": "2026-05-31T00:00:00.000Z"
}
```
