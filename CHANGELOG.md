# Changelog

## [Unreleased] — 2026-07-20

### Agregado
- Workflow v2 corregido (`workflows/la-pasteleria-bot-whatsapp-v2.json`): lectura correcta del payload de Meta, rama de pedido confirmado validada por código, fecha+hora de retiro con zona America/Santiago, dedup por `wamid`, validación del verify token en el GET, manejo de errores con hoja de incidentes, placeholders sin credenciales.
- Documentación: `docs/AUDITORIA_TECNICA.md`, `docs/FLUJO_DE_TRABAJO.md`, `docs/CONFIGURACION.md`, `docs/PLAN_PILOTO.md`.
- Pruebas: `tests/CASOS_DE_PRUEBA.md` (30 casos), `tests/DATOS_DE_PRUEBA.json` (payloads de Meta).
- `.gitattributes` para normalizar finales de línea (Windows).

### Cambiado
- Export original del workflow estandarizado como `workflows/la-pasteleria-bot-whatsapp.json` (contenido intacto).

### Notas
- El workflow v1 de producción no fue modificado; la v2 se importa desactivada en ruta propia.
