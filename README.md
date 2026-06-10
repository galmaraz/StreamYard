# WebLive2026
Proyecto de transmisión en vivo
inicio de proyecto
2026

## Documentacion

- [Requerimientos del sistema](docs/requerimientos.md)
- [Backlog MVP](docs/backlog-mvp.md)

## Componentes

- [Backend NestJS](backend/README.md)
- [Frontend Angular](frontend/README.md)

## Infraestructura local

Copiar variables de entorno:

```bash
cp .env.example .env
```

Levantar PostgreSQL:

```bash
docker compose up -d postgres
```

Detener servicios:

```bash
docker compose down
```

## Prueba en red local con celular

Para abrir la app desde un celular conectado a la misma red WiFi, usa la IP local de la computadora. En macOS puedes verla con:

```bash
ipconfig getifaddr en0
```

Ejemplo: si la IP es `192.168.1.50`, el celular debe entrar a:

```text
http://192.168.1.50:4200
```

Levantar servicios:

```bash
docker compose up -d postgres
```

```bash
cd backend
npm run start:lan
```

```bash
cd frontend
npm run start:lan
```

Para que camara y microfono funcionen en moviles, usa HTTPS local:

```bash
./scripts/create-local-cert.sh 192.168.1.50
```

Cambia `192.168.1.50` por tu IP local real. Luego levanta:

```bash
cd backend
npm run start:lan:https
```

```bash
cd frontend
npm run start:lan:https
```

Y abre desde el celular:

```text
https://192.168.1.50:4200
```

Si el navegador muestra advertencia por certificado local, acepta o confia el certificado para esta prueba.
