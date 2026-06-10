# WebLive2026 Backend

Backend NestJS para la plataforma de videoconferencias y transmisiones en vivo.

## Requisitos

- Node.js 20 o superior
- npm

## Instalacion

```bash
npm install
```

## Variables de entorno

Crear un archivo `.env` a partir de `.env.example`.

```bash
cp .env.example .env
```

Variables iniciales:

```env
NODE_ENV=development
HOST=0.0.0.0
PORT=3000
FRONTEND_URL=http://localhost:4200
FRONTEND_URLS=
HTTPS_ENABLED=false
HTTPS_KEY_PATH=../certs/local-key.pem
HTTPS_CERT_PATH=../certs/local-cert.pem
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=weblive2026
DATABASE_USER=weblive
DATABASE_PASSWORD=weblive_dev_password
DATABASE_SSL=false
JWT_SECRET=change_me_in_real_environments
JWT_EXPIRES_IN=1d
```

## Comandos

```bash
npm run start:dev
```

Levanta el backend en modo desarrollo.

```bash
npm run start:lan
```

Levanta el backend escuchando en la red local.

```bash
npm run start:lan:https
```

Levanta el backend con HTTPS local usando `../certs/local-key.pem` y `../certs/local-cert.pem`.

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
cp .env.example .env
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

## Auth inicial

Endpoints disponibles:

```http
POST /auth/register
POST /auth/login
POST /auth/guest
GET /auth/me
```

Ejemplo de registro:

```json
{
  "email": "host@demo.com",
  "password": "12345678",
  "displayName": "Host Demo",
  "role": "host"
}
```

`GET /auth/me` requiere:

```http
Authorization: Bearer <accessToken>
```

Ejemplo de invitado:

```json
{
  "displayName": "Invitado Demo"
}
```

## Users administrativo

Endpoints protegidos con JWT y rol `admin`:

```http
POST /users
GET /users
GET /users/:id
PATCH /users/:id
PATCH /users/:id/deactivate
DELETE /users/:id
```

Campos principales:

```json
{
  "email": "host@demo.com",
  "password": "12345678",
  "displayName": "Host Demo",
  "role": "host",
  "isActive": true
}
```

El registro publico crea usuarios `host`. Los roles administrativos se gestionan desde este modulo o directamente desde la base local durante desarrollo.

## Rooms inicial

Endpoints protegidos con JWT:

```http
POST /rooms
GET /rooms
GET /rooms/invite/:slug
GET /rooms/:slug
POST /rooms/:id/end
```

Ejemplo de creacion:

```json
{
  "title": "Demo semanal",
  "isPrivate": false
}
```

Cada sala queda asociada al host autenticado y devuelve un `invitationPath` publico con el formato:

```text
/join/demo-semanal
```

## Participants inicial

Endpoints protegidos con JWT:

```http
POST /rooms/:slug/participants/join
GET /rooms/:slug/participants
PATCH /participants/:id/state
PATCH /participants/:id/moderation
POST /participants/:id/kick
POST /participants/:id/leave
```

Ejemplo de entrada a sala:

```json
{
  "displayName": "Invitado Demo",
  "socketId": "socket-id-opcional"
}
```

Ejemplo de actualizacion de estado:

```json
{
  "micEnabled": false,
  "cameraEnabled": true,
  "handRaised": false
}
```

`PATCH /participants/:id/moderation` y `POST /participants/:id/kick` solo pueden ser ejecutados por el host de la sala.

Ejemplo de moderacion:

```json
{
  "micEnabled": false,
  "cameraEnabled": false,
  "handRaised": false
}
```

## WebSocket Gateway inicial

El gateway usa Socket.IO y requiere JWT en el handshake:

```ts
io("http://localhost:3000", {
  auth: {
    token: "<accessToken>"
  }
})
```

Eventos principales:

```text
join-room
leave-room
toggle-mic
toggle-camera
raise-hand
moderate-participant
kick-participant
chat-message
offer
answer
ice-candidate
participant-connected
participant-disconnected
participant-updated
participant-kicked
```

Payload para `join-room`:

```json
{
  "slug": "demo-semanal",
  "displayName": "Host Demo"
}
```

Payload para signaling:

```json
{
  "slug": "demo-semanal",
  "targetSocketId": "socket-destino",
  "payload": {}
}
```

## Chat inicial

Endpoint protegido con JWT:

```http
GET /rooms/:slug/chat/messages
```

Devuelve los ultimos 50 mensajes de la sala activa. El usuario debe ser host o participante conectado.

Evento Socket.IO:

```text
chat-message
```

Payload:

```json
{
  "content": "Hola a todos"
}
```

## Siguiente paso

El siguiente modulo recomendado es mejorar compartir pantalla, grabacion u overlays sobre la sala.
