# Lumenhash IA Express Core

Automatización conversacional con IA para pymes: WhatsApp, agenda, leads y workflows operativos.

## Objetivo
Este repositorio centraliza la base técnica del proyecto IA Express de Lumenhash.

## Alcance inicial
- atención conversacional humanizada
- gestión de citas y calendario
- captura de leads
- registro operativo
- workflows automatizados
- futura arquitectura multi-cliente

## Stack previsto
- GitHub
- Docker Compose
- n8n
- PostgreSQL
- WhatsApp
- proveedor LLM por API

## Estructura
- `docs/` documentación técnica y operativa
  - `AUDITORIA_TECNICA.md` — auditoría nodo por nodo del workflow v1
  - `FLUJO_DE_TRABAJO.md` — cómo funciona el bot (diagrama incluido)
  - `CONFIGURACION.md` — guía para importar y configurar la v2
  - `PLAN_PILOTO.md` — plan de pruebas piloto en 4 etapas
- `workflows/` flujos de n8n
  - `la-pasteleria-bot-whatsapp.json` — export original (v1, respaldo, no editar)
  - `la-pasteleria-bot-whatsapp-v2.json` — versión corregida (desactivada, con placeholders, sin credenciales)
- `tests/` casos de prueba y payloads de Meta
- `infra/` despliegue y scripts
- `knowledge/` base de conocimiento
- `client_templates/` plantillas por rubro

## Estado
Piloto en preparación: workflow v2 auditado y corregido, pendiente de pruebas según `docs/PLAN_PILOTO.md`.
