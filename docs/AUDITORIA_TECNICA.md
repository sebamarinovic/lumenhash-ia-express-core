# Auditoría Técnica — Workflow "🧁 La Pastelería — Bot WhatsApp"

**Fecha:** 2026-07-20 · **Auditor:** Equipo técnico LUMENHASH (Claude)
**Archivo auditado:** `workflows/la-pasteleria-bot-whatsapp.json` (copia exacta del export de n8n Cloud, sin modificar)
**Estado del workflow en el export:** `active: true`, etiquetas: La Pastelería, Producción, WhatsApp
**Nodos:** 19 · **Versión n8n:** Cloud (executionOrder v1)

---

## 1. Resumen ejecutivo

El workflow tiene una base conceptual correcta (webhook → estado en Sheets → LLM → switch → acciones), pero contiene **dos defectos críticos que impiden que funcione en producción** y varios de alta severidad:

1. El nodo que extrae los datos del mensaje lee `$json.entry[...]` cuando el webhook de n8n entrega el payload bajo `$json.body.entry[...]`. Resultado: teléfono y mensaje llegan `undefined` a todo el flujo.
2. El Switch de acción **no tiene rama para pedido confirmado**. El registro del pedido, el evento de Calendar y el correo dependen de que el modelo devuelva `accion_interna = "notificar_duena"`, pero el prompt nunca le indica cuándo usar ese valor, y además ordena escalar a humano las tortas de encargo confirmadas. Un pedido confirmado normal cae en la rama *default* y **nunca se registra**.

Adicionalmente: no hay control de duplicados (Meta reintenta webhooks), el evento de Calendar se crea siempre para **hoy** (solo usa la hora), el webhook de verificación GET no valida `hub.verify_token`, y no existe manejo de errores para caídas de OpenAI, Sheets, Calendar, Gmail o WhatsApp.

**No se encontraron claves API ni tokens en el export** (las credenciales son referencias por ID de n8n, correcto). Sí contiene identificadores que deben reemplazarse por placeholders antes de publicar: `phone_number_id`, ID del Google Sheet, correos personales, `instanceId`.

---

## 2. Inventario de nodos y flujo real

```
[GET]  Webhook (verificación) ──> Respond to Webhook (hub.challenge)     ← sin validar verify_token
[POST] 01 Webhook Twilio ──> 02 ACK 200 Twilio
                        └──> 03 Extraer Datos Mensaje ──> 04 Leer Estado [Sheets]
                             ──> 05 Preparar Input Claude ──> 06 API Claude [Anthropic] (⚠ llama a OpenAI)
                             ──> 07 Parsear Respuesta Claude ──> 08 Guardar Estado [Sheets]
                             ──> 09 Switch Acción
                                  ├─ accion_interna == "notificar_duena"  → 10 Calendar → 11 Gmail → 12 Registrar Pedido → 13 WhatsApp [pedido ✓]
                                  ├─ accion_interna == "escalar_humano"   → 14 Gmail Alerta → 15 WhatsApp [escalar]
                                  └─ default                              → 16 WhatsApp [default]

[HUÉRFANO] If (valida body.entry...messages) — no conectado a nada
```

---

## 3. Auditoría nodo por nodo

| # | Nodo | Tipo/ver | Función | Hallazgos | Criticidad |
|---|------|----------|---------|-----------|------------|
| 1 | `01 · Webhook Twilio` | webhook v2 | Recibe POST de Meta en `/lapasteleria-whatsapp` | Nombre engañoso: es WhatsApp Cloud API, no Twilio. Sin verificación de firma `X-Hub-Signature-256`. Procesa cualquier payload (estados de entrega incluidos). | Alto |
| 2 | `02 · ACK 200 Twilio` | respondToWebhook v1.1 | Responde 200 a Meta | Nombre engañoso. Responde texto con header `Content-Type: application/json` (inconsistencia menor). El ACK ocurre antes del procesamiento pesado: correcto. | Bajo |
| 3 | `03 · Extraer Datos Mensaje` | set v3.4 | Extrae mensaje, teléfono, phone_number_id | **CRÍTICO:** lee `$json.entry[0]...` — el webhook v2 entrega el payload en `$json.body.entry[0]...`. Todos los campos salen `undefined`. No extrae `wamid` (ID único del mensaje) → imposibilita dedup. No valida que exista `messages[0].text` (audio/imagen/sticker rompen el flujo). | **Crítico** |
| 4 | `04 · Leer Estado [Sheets]` | googleSheets v4.5 | Busca fila por `telefono` en hoja EstadoConversacion | Depende del teléfono `undefined` del nodo 3. Sin manejo de error si Sheets no responde. ID del documento hardcodeado. | Alto |
| 5 | `05 · Preparar Input Claude` | code v2 | System prompt (16 KB, carta completa) + historial + contexto | Construye body formato **Anthropic** (`system`, `model: claude-sonnet-4`) que el nodo 6 luego re-mapea a formato OpenAI: el campo `model` del body se ignora. Carta de productos embebida en el código (mantención difícil). Truncado de historial inconsistente con nodo 7 (30 vs 40). No captura fecha de retiro, solo hora. | Alto |
| 6 | `06 · API Claude [Anthropic]` | httpRequest v4.2 | **Llama a OpenAI** `/v1/chat/completions`, `gpt-4o-mini` | Nombre contradice la realidad. Dos credenciales adjuntas (Header Auth + OpenAI): confuso. Timeout 30 s sin reintentos ni rama de error. Temperatura 0.7 alta para salida JSON estricta. | Alto |
| 7 | `07 · Parsear Respuesta Claude` | code v2 | Parsea JSON del modelo, arma historial | Fallback de parseo existe (bien), pero resetea `nuevo_estado` a INICIO perdiendo el estado real. No valida schema (tipos, campos obligatorios, precios inventados). | Medio |
| 8 | `08 · Guardar Estado [Sheets]` | googleSheets v4.5 | appendOrUpdate por `telefono` | Guarda `telefono.replace('+','')` pero el nodo 4 busca el teléfono sin normalizar → riesgo de filas duplicadas por cliente. Sin manejo de error. Celdas de historial pueden exceder el límite de 50.000 caracteres de Sheets. | Alto |
| 9 | `09 · Switch Acción` | switch v3.2 | Enruta por `accion_interna` | **CRÍTICO:** no existe rama por `pedido_confirmado`. La rama que registra pedidos se activa solo con `accion_interna == "notificar_duena"`, valor que el prompt nunca instruye usar. Además la regla 1 del prompt ordena `escalar_humano` al confirmar tortas de encargo → pedidos confirmados terminan en default o escalamiento y **no se registran ni agendan**. | **Crítico** |
| 10 | `10 · Google Calendar — Evento` | googleCalendar v1.3 | Crea evento de retiro | **CRÍTICO:** usa `new Date()` (hoy) + `hora_retiro`; jamás usa la fecha pedida por el cliente. Si no hay hora, agenda "en 1 hora". `toISOString()` sin zona horaria America/Santiago (Cloud corre en UTC → hora corrida). Calendario personal hardcodeado. Sin dedup → eventos duplicados. | **Crítico** |
| 11 | `11 · Gmail — Notificar Dueña` | gmail v2.1 | Correo de pedido a lumenhashspa@gmail.com | Correo hardcodeado. Sin manejo de error; si Gmail falla, se corta la cadena y el pedido no se registra (nodo 12 nunca corre). Orden de cadena frágil: Calendar→Gmail→Sheets→WhatsApp en serie. | Alto |
| 12 | `12 · Sheets — Registrar Pedido` | googleSheets v4.5 | Append en hoja Pedidos | Sin `codigo_pedido` único. Teléfono sin normalizar (inconsistente con nodo 8). Sin fecha de retiro (solo hora). Sin dedup. | Alto |
| 13 | `13 · WhatsApp Reply [pedido ✓]` | httpRequest v4.2 | Envía respuesta por Graph API | `graph.facebook.com/v17.0` (obsoleta; vigente v23.x — verificar antes de cambiar). `phone_number_id` hardcodeado en URL. Dos credenciales adjuntas (Twilio Basic Auth + WhatsApp): la de Twilio sobra. | Medio |
| 14 | `14 · Gmail — Alerta Urgente` | gmail v2.1 | Alerta de escalamiento | Correcto en lo esencial. Correo hardcodeado, sin manejo de error. | Medio |
| 15 | `15 · WhatsApp Reply [escalar]` | httpRequest v4.2 | Respuesta al cliente escalado | Igual que nodo 13 (v17.0, credencial Twilio sobrante). | Medio |
| 16 | `16 · WhatsApp Reply [default]` | httpRequest v4.2 | Respuesta conversación normal | **Bug de serialización:** construye el JSON por interpolación de strings (no `JSON.stringify`). Si la respuesta del modelo contiene comillas o saltos de línea, el body queda inválido y WhatsApp rechaza el mensaje. Usa `.item` en vez de `.first()`. Usa una credencial distinta ("WhatsApp account 2") sin razón aparente. | Alto |
| 17 | `Webhook` (GET) | webhook v2.1 | Verificación de Meta | Misma ruta que el POST (válido en n8n por método distinto), pero **no valida `hub.verify_token`**: responde el challenge a cualquiera. Nombre genérico. | Alto |
| 18 | `Respond to Webhook` | respondToWebhook v1.5 | Devuelve `hub.challenge` | Funciona, pero hereda el problema del 17. | — |
| 19 | `If` | if v2.3 | Valida que el payload tenga `messages` | **Nodo huérfano**: no está conectado a nada. Es justamente la validación que falta en la rama POST (filtrar estados de entrega y payloads sin mensaje). Evidencia de refactor a medio hacer. | Alto |

---

## 4. Hallazgos transversales

### Críticos
- **C1. Lectura del payload rota** (`$json.entry` vs `$json.body.entry`) — nodo 3. El flujo completo no funciona con payloads reales de Meta.
- **C2. Lógica de confirmación rota** — el prompt define `pedido_confirmado` pero el Switch solo mira `accion_interna`; no hay instrucción de cuándo emitir `notificar_duena`; tortas de encargo confirmadas se desvían a escalamiento. Pedidos confirmados no se registran.
- **C3. Fecha del evento siempre "hoy"** — nodo 10 ignora la fecha de retiro y la zona horaria America/Santiago.
- **C4. Sin idempotencia** — no se extrae ni verifica `wamid`; los reintentos de Meta generan respuestas, filas, correos y eventos duplicados.

### Altos
- **A1.** Verificación GET sin validar `hub.verify_token` (nodo 17).
- **A2.** Sin validación de firma `X-Hub-Signature-256` en el POST.
- **A3.** Payloads de estado (delivered/read) y mensajes no-texto (audio, imagen) entran al flujo y generan filas basura o errores; el nodo If que los filtraría está desconectado.
- **A4.** Normalización de teléfono inconsistente (lookup sin normalizar vs guardado con `replace('+','')`).
- **A5.** Sin manejo de errores en ninguna integración (OpenAI, Sheets, Calendar, Gmail, WhatsApp); cadena serial Calendar→Gmail→Sheets→WhatsApp donde cualquier fallo corta el registro del pedido y deja al cliente sin respuesta.
- **A6.** Bug de serialización JSON en nodo 16 (rama más usada del bot).
- **A7.** Naming falso en 6 nodos (Twilio/Claude vs realidad Meta/OpenAI) + credenciales sobrantes de Twilio y duplicadas de WhatsApp/OpenAI: alto riesgo de error operacional.
- **A8.** No se captura **fecha** de retiro en ninguna parte del modelo de datos (solo `hora_retiro`).

### Medios
- **M1.** Graph API v17.0 obsoleta (verificar versión vigente y ventana de deprecación antes de migrar).
- **M2.** Fallback de parseo resetea el estado de conversación a INICIO.
- **M3.** Sin validación de schema/precios de la respuesta del modelo (puede inventar productos o totales).
- **M4.** Carta completa (16 KB) embebida en un nodo Code: mantención frágil, se envía completa en cada llamada (~4.000 tokens por mensaje).
- **M5.** Truncado de historial inconsistente (30 vs 40) y riesgo de límite de celda en Sheets.
- **M6.** Sin validación de horario de atención, anticipación de 24 h ni fechas pasadas fuera del prompt (el LLM es la única barrera).

### Bajos / mejora futura
- **B1.** `Content-Type` inconsistente en ACK.
- **B2.** Temperatura 0.7 para salida JSON estricta (bajar a ~0.3 o usar salida estructurada).
- **B3.** Identificadores a sanitizar antes de publicar: `phone_number_id` (1120470911147248), ID de Google Sheet, correos (`sebamarinovic.leiva@gmail.com`, `lumenhashspa@gmail.com`), `instanceId`, IDs de credenciales.
- **B4.** El export está `active: true`; cualquier import accidental lo activaría.

---

## 5. Seguridad del export

Sin claves API, tokens ni contraseñas en el JSON (verificado por patrones `sk-`, `EAA`, `AIza` y revisión manual). Las credenciales son referencias por ID de la instancia n8n: correcto. Pendiente: sanitizar identificadores del punto B3 en la versión que se publique; la copia local en `workflows/` se mantiene íntegra como respaldo del original.

---

## 6. Recomendación general

No apto para piloto en su estado actual (C1 impide siquiera procesar un mensaje real; C2–C4 corrompen el caso de negocio principal). Corregir C1–C4 y A1–A8 en la versión v2 (`workflows/la-pasteleria-bot-whatsapp-v2.json`), manteniendo el original intacto. El diseño de la v2 se presentará para aprobación antes de construirla (FASE 4).
