# Plan de pruebas piloto — Bot WhatsApp La Pastelería v2

Cuatro etapas progresivas. No pasar a la siguiente sin cumplir los criterios de salida de la anterior. En todo momento la v1 de producción queda intacta: la v2 usa su propia ruta (`/lapasteleria-whatsapp-v2`).

---

## ETAPA 0 — Preparación (una vez, ~30 min)

1. **Copia de prueba del Google Sheet**: Archivo → Hacer una copia. En la copia, crear pestañas `MensajesProcesados` (`wamid | telefono | fecha`) e `Incidentes` (`fecha | workflow | nodo | tipo_error | mensaje | telefono | resuelto`), y agregar columnas `fecha_retiro` (en `EstadoConversacion` y `Pedidos`) y `codigo_pedido`, `calendar_event_id` (en `Pedidos`).
2. **Calendario de prueba**: en Google Calendar crear un calendario nuevo "Pedidos PRUEBA" (evita ensuciar el real). Copiar su ID (Configuración del calendario → ID).
3. **Importar v2** en n8n Cloud: Workflows → Import from File → `workflows/la-pasteleria-bot-whatsapp-v2.json`. NO activar.
4. **Placeholders**: en `⚙️ CONFIG · Cliente` poner sheet_id (de la COPIA), calendar_id (el de PRUEBA), email_encargada (tu correo por ahora), phone_number_id. En `GET · ¿Token válido?` poner el verify token.
5. **Credenciales**: asignar en cada nodo con advertencia (Sheets ×5, Calendar ×1, Gmail ×2, OpenAI ×1, WhatsApp ×4). No usar Twilio.

**Criterio de salida:** el workflow abre sin advertencias de nodos.

---

## ETAPA 1 — Pruebas técnicas sin WhatsApp real (modo test, ~1 h)

Cada prueba: clic en **Execute workflow** en n8n → lanzar el curl → revisar la ejecución nodo a nodo. Payloads en `tests/DATOS_DE_PRUEBA.json` (guardar cada uno como archivo, p. ej. `p1.json`).

| Orden | Prueba | Comando / payload | Resultado esperado |
|---|---|---|---|
| 1.1 | Verificación GET ok | `curl ".../webhook-test/lapasteleria-whatsapp-v2?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=12345"` | Devuelve `12345` |
| 1.2 | GET token malo | mismo curl con token incorrecto | HTTP 403 |
| 1.3 | Saludo | POST payload `01` | Rama default; fila en EstadoConversacion; wamid registrado; respuesta generada (el envío WhatsApp falla por teléfono ficticio: esperado) |
| 1.4 | Status delivered | POST payload `04` | Termina en "Fin · Payload descartado", sin filas |
| 1.5 | Duplicado | POST payload `03` dos veces | 2ª ejecución termina en "Fin · Mensaje duplicado" |
| 1.6 | Imagen / audio | payloads `05` y `06` | Respuesta pide texto; sin error |
| 1.7 | Torta < 24 h | payload `07` | Confirmación bloqueada; el bot ofrece fecha válida |
| 1.8 | Alergia | payload `08` | Rama escalar_humano; correo de alerta recibido |
| 1.9 | Pedido completo | payload `02` y luego mensajes de seguimiento hasta confirmar (editar el body y wamid en cada envío) | Rama pedido_confirmado; fila en Pedidos con código LP-...; evento en calendario de PRUEBA con fecha/hora correctas; correo recibido |
| 1.10 | Error OpenAI | duplicar credencial OpenAI con key inválida, asignarla temporalmente | Cliente recibiría mensaje seguro; fila en Incidentes; restaurar credencial |

**Criterio de salida:** 10/10 correctas. Registrar resultados marcando `tests/CASOS_DE_PRUEBA.md`.

---

## ETAPA 2 — WhatsApp real con TU número (~1–2 días)

Aquí el bot conversa de verdad, pero solo contigo.

1. **Activar la v2** en n8n (⚠️ este es el punto que requiere decisión explícita).
2. En Meta App → WhatsApp → Configuration → Webhook → **Edit**: cambiar la Callback URL a `https://TU-INSTANCIA.app.n8n.cloud/webhook/lapasteleria-whatsapp-v2` (ruta de producción de la v2, sin `-test`). Verify token: el mismo. Meta validará el GET al guardar.
   - Esto desvía TODO el tráfico entrante a la v2. Hacerlo en horario de baja demanda. La v1 puede quedar activa como respaldo: sin tráfico, no hace nada.
3. Desde tu WhatsApp personal, ejecutar en modo conversación real los casos 1–15 y 24–30 de `tests/CASOS_DE_PRUEBA.md`: saludo, consultas, armar pedido, confirmar, cancelar, cliente molesto, "¿eres un bot?", mensajes rápidos seguidos, etc.
4. Verificar en cada pedido confirmado: Sheet, calendario, correo y respuesta, con fecha/hora exactas (America/Santiago).
5. Revisar n8n → Executions cada día: ejecuciones fallidas, hoja Incidentes.

**Rollback inmediato si algo grave falla:** volver a poner la Callback URL anterior en Meta (2 minutos) — la v1 retoma el tráfico.

**Criterio de salida:** 3 pedidos de prueba completos sin errores; 0 duplicados; ninguna respuesta inventando productos o precios.

---

## ETAPA 3 — Piloto cerrado con la encargada (3–5 días)

1. Cambiar en CONFIG: `email_encargada` → correo real de la encargada; `calendar_id` → calendario real (o mantener el de prueba si prefiere validar antes); `sheet_id` puede seguir siendo la copia.
2. Reclutar 3–5 personas de confianza (familia/amigos de la dueña) que hagan pedidos reales simulados sin guion.
3. La encargada valida: ¿los correos son claros?, ¿el evento del calendario le sirve?, ¿el tono del bot representa al local?
4. Registrar cada conversación problemática (screenshot + wamid) para ajustar prompt o validaciones.
5. Ajustes de prompt/carta se hacen en el nodo `IA · Preparar contexto` — anotar cada cambio para replicarlo en el JSON del repo.

**Criterio de salida:** aprobación de la encargada + ≥90% de conversaciones sin intervención.

---

## ETAPA 4 — Piloto real limitado (1–2 semanas)

1. Cambiar `sheet_id` al Sheet definitivo (con las pestañas nuevas creadas) y calendario real.
2. Operar con clientes reales en horario de atención, con la encargada monitoreando el correo y con capacidad de responder manualmente por WhatsApp si el bot escala.
3. Revisión diaria (10 min): n8n Executions con error, hoja Incidentes, pedidos vs. calendario (conciliación), conversaciones escaladas.
4. Métricas de la semana: mensajes recibidos, pedidos confirmados, escalamientos, errores, ejecuciones n8n consumidas (plan Starter: 2.500/mes).
5. Al cierre: decisión go/no-go de producción definitiva + desactivar y archivar la v1.

**Criterios de aceptación finales:** los 20 puntos de la sección 9 del brief del proyecto (webhook verificado, sin duplicados, fechas correctas, trazabilidad, etc.).

---

## Reglas permanentes durante el piloto

- Nunca probar enviando mensajes a números de clientes reales.
- Cualquier cambio al workflow: exportar JSON actualizado al repo el mismo día.
- No editar la v1 de producción; es el plan de rollback.
- Secretos solo en credenciales de n8n y `.env` local.
