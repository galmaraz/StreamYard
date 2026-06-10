#!/usr/bin/env bash
set -euo pipefail

LOCAL_IP="${1:-}"

if [ -z "$LOCAL_IP" ]; then
  echo "Uso: ./scripts/create-local-cert.sh <IP_LOCAL>"
  echo "Ejemplo: ./scripts/create-local-cert.sh 192.168.1.50"
  exit 1
fi

mkdir -p certs

openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout certs/local-key.pem \
  -out certs/local-cert.pem \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:${LOCAL_IP}"

echo "Certificado local generado en certs/local-cert.pem"
echo "Llave local generada en certs/local-key.pem"
