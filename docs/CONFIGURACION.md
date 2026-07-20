# Configuración — dejar el bot v2 listo para pruebas

Guía paso a paso para importar `workflows/la-pasteleria-bot-whatsapp-v2.json` en n8n Cloud y probarlo **sin tocar el workflow de producción** (la v2 usa la ruta `/lapasteleria-whatsapp-v2`, distinta a la v1).

## 1. Preparar el Google Sheet

En el spreadsheet del bot (o en una **copia de prueba**, recomendado), crear/verificar 4 pestañas con estas cabeceras en la fila 1:

- `EstadoConversacion`: `telefono | estado_conversacion | historial | pedido_actual | nombre_cliente | fecha_retiro | hora_retiro | ultima_actualizacion`
  (la v1 no tenía `fecha_retiro`: agregar esa columna)
- `Pedidos`: `codigo_pedido | timestamp | telefono | nombre_cliente | fecha_retiro | hora_retiro | productos | total | estado | nota_interna | calendar_event_id`
- `MensajesProcesados` (nueva): `wamid | telefono | fecha`
- `Incidentes` (nueva): `fecha | workflow | nodo | tipo_error | mensaje | telefono | resuelto`

## 2. Importar el workflow

1. n8n Cloud → Workflows → **Import from File** → seleccionar `la-pasteleria-bot-whatsapp-v2.json`.
2. El workflow queda **desactivado**: mantenerlo así hasta terminar la configuración.

## 3. Reemplazar placeholders

En el nodo **⚙️ CONFIG · Cliente**:

| Campo | Valor |
|---|---|
| `sheet_id` | ID del spreadsheet (el tramo largo de la URL de Google Sheets) |
| `calendar_id` | correo del calendario de Google a usar |
| `email_encargada` | correo que recibe pedidos y alertas |
| `whatsapp_phone_number_id` | Phone Number ID de Meta (WhatsApp → API Setup) |
| `graph_api_version` | `v21.0` (verificar vigencia en developers.facebook.com) |
| `openai_model` | `gpt-4o-mini` (o el que se decida) |

En el nodo **GET · ¿Token válido?**: reemplazar `REEMPLAZAR_VERIFY_TOKEN` por el verify token definido en Meta (el mismo del `.env` local, variable `WHATSAPP_VERIFY_TOKEN`).

## 4. Asignar credenciales

Los nodos quedan sin credenciales a propósito. Asignar las existentes de la instancia:

| Nodos | Credencial |
|---|---|
| Dedup/Estado/Pedido/Incidente (Sheets) | Google Sheets OAuth2 |
| Pedido · Evento [Calendar] | Google Calendar OAuth2 |
| Correos (Gmail) | Gmail OAuth2 |
| IA · OpenAI Chat | OpenAI account |
| WA · Responder (4 nodos) | WhatsApp account (una sola, la vigente) |

No usar la credencial de Twilio: sobra en esta arquitectura.

## 5. Probar SIN WhatsApp real (modo test de n8n)

1. Abrir el workflow → **Execute workflow** (modo test) → n8n expone las URLs de test de los webhooks.
2. Verificación GET:
   `curl "https://TU-INSTANCIA.app.n8n.cloud/webhook-test/lapasteleria-whatsapp-v2?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=12345"`
   → debe devolver `12345`. Con token incorrecto → 403.
3. Mensaje entrante: enviar por POST los payloads de `tests/DATOS_DE_PRUEBA.json`:
   `curl -X POST https://TU-INSTANCIA.app.n8n.cloud/webhook-test/lapasteleria-whatsapp-v2 -H "Content-Type: application/json" -d @payload.json`
   Usar un teléfono de prueba (p. ej. `56900000001`); el envío final de WhatsApp fallará solo si ese número no existe — el resto del flujo es verificable en la ejecución.
4. Revisar en n8n la ejecución nodo a nodo y en el Sheet las filas creadas.
5. Reenviar el **mismo payload** (mismo `wamid`) → la ejecución debe terminar en "Fin · Mensaje duplicado" sin repetir nada.

## 6. Prueba end-to-end con WhatsApp real (requiere aprobación)

1. Activar el workflow (⚠️ solo con autorización explícita).
2. En Meta App → WhatsApp → Configuration → Webhook: apuntar temporalmente la URL de callback a `/webhook/lapasteleria-whatsapp-v2` (esto **desvía el tráfico de la v1**: hacerlo en horario controlado y con un número de prueba registrado en la app de Meta).
3. Enviar mensajes desde el número de prueba, nunca a clientes reales.
4. Al terminar, restaurar el webhook a la ruta original o dejar la v2 como definitiva.

## 7. Checklist antes del piloto

- [ ] GET responde challenge solo con token correcto
- [ ] Payload de estado (delivered) se descarta sin error
- [ ] Mensaje duplicado no genera segunda respuesta/fila
- [ ] Pedido sin fecha NO se confirma (el bot pide la fecha)
- [ ] Pedido confirmado crea: fila en Pedidos + evento con fecha correcta + correo + WhatsApp
- [ ] Torta con retiro < 24 h es rechazada con alternativa
- [ ] Imagen/audio recibe respuesta pidiendo texto
- [ ] Caída de OpenAI (simular con API key inválida en credencial de prueba) → cliente recibe mensaje seguro + fila en Incidentes

## Secretos

Nunca escribir tokens/keys en el workflow ni en este repo. Credenciales solo en el gestor de n8n; valores de referencia local en `.env` (ignorado por Git).
