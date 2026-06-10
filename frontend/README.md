# WebLive2026 Frontend

Frontend Angular para la plataforma WebLive2026.

## Flujo inicial implementado

- Registro/login contra el backend NestJS.
- Dashboard protegido con JWT.
- Creacion y listado de salas.
- Links de invitacion publica por `/join/:slug`.
- Entrada de invitados con nombre visible y JWT temporal.
- Entrada a sala por `/conference/:slug`.
- Conexion Socket.IO autenticada con JWT.
- Estado de participantes en tiempo real.
- Controles iniciales de microfono y camara.
- Control host/invitado en sala.
- Levantar y bajar mano.
- Moderacion del host: silenciar participante, bloquear camara y expulsar.
- Chat en tiempo real por sala con historial basico.
- Pantalla administrativa de usuarios para rol `admin`.
- Captura local con `getUserMedia`.
- Peer connections WebRTC iniciales con `offer`, `answer` e `ice-candidate`.

## Servidor de desarrollo

```bash
npm start
```

La app queda disponible en:

```text
http://localhost:4200
```

Para probar desde un celular en la misma red:

```bash
npm run start:lan
```

La app quedara disponible usando la IP local de la computadora:

```text
http://<IP_LOCAL>:4200
```

Para camara y microfono en moviles, usa HTTPS:

```bash
npm run start:lan:https
```

La URL del backend se calcula automaticamente con el mismo hostname:

```text
https://<IP_LOCAL>:3000
```

El backend esperado es:

```text
http://localhost:3000
```

## Comandos

```bash
npm run build
npm test -- --watch=false
```

## Rutas

```text
/auth
/join/:slug
/dashboard
/users
/conference/:slug
```

## WebRTC inicial

La sala intenta activar camara/microfono con `getUserMedia`. Si el usuario no concede permisos, Socket.IO y presencia siguen funcionando.

Cuando la media local esta disponible, el participante que entra crea `RTCPeerConnection` hacia los participantes activos usando el gateway como signaling server.

## Moderacion de sala

El host ve acciones de moderacion sobre cada invitado conectado:

- Silenciar microfono.
- Bloquear camara.
- Bajar mano levantada.
- Expulsar de la sala.

Los invitados conservan sus controles locales de microfono/camara y pueden levantar la mano. Cuando el host silencia o bloquea camara, la UI sincroniza el estado del participante afectado y apaga las pistas locales correspondientes.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
