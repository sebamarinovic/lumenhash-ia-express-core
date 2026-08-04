# Configuración — Prohausen Bot WhatsApp v1

Workflow: `workflows/prohausen-bot-whatsapp-v1.json`

> Importar desactivado. No conectar el número real de Prohausen hasta completar las pruebas.

## 1. Alcance del MVP

La primera versión:

- recibe mensajes desde WhatsApp Cloud API;
- descarta estados y mensajes duplicados;
- mantiene contexto por teléfono;
- clasifica compra, arriendo, venta, publicación, administración e inversión;
- consulta un catálogo controlado en Google Sheets;
- recomienda como máximo tres propiedades sin inventar datos;
- calcula un puntaje comercial de 0 a 100;
- registra y actualiza leads;
- deriva captaciones, reclamos, negociaciones y leads prioritarios;
- registra solicitudes de visita y crea un evento pendiente de validación.

Smarty y Proprent se mantienen como sistemas principales. La conexión directa se implementará después de validar API, webhooks o exportaciones disponibles.

## 2. Google Sheet

Crear un spreadsheet con estas pestañas y encabezados exactos:

### `MensajesProcesados`

`wamid | telefono | fecha`

### `EstadoConversacion`

`telefono | estado_conversacion | historial | perfil_lead | nombre_cliente | email | operacion | tipo_propiedad | comuna | presupuesto_min | presupuesto_max | dormitorios | banos | financiamiento | plazo | property_id | puntaje | clasificacion | ultima_actualizacion`

### `Leads`

`lead_id | timestamp | telefono | nombre | email | operacion | tipo_propiedad | comuna | sector | presupuesto_min | presupuesto_max | dormitorios | banos | financiamiento | plazo | objetivo | property_id | puntaje | clasificacion | estado | nota_interna | ultima_interaccion`

### `CatalogoPropiedades`

`property_id | estado | operacion | tipo_propiedad | comuna | sector | precio_venta | arriendo_mensual | dormitorios | banos | estacionamientos | superficie_total | gastos_comunes | rentabilidad_bruta | url_publica | direccion_publica | destacado | actualizado_en`

Reglas del catálogo:

- `estado` debe ser `disponible` para que la IA pueda utilizar la propiedad.
- `property_id` debe ser único y estable.
- `direccion_publica` no debe contener información confidencial.
- No cargar datos de propietarios, RUT, contratos ni documentos privados.
- Toda rentabilidad debe provenir de información validada por Prohausen.

### `Visitas`

`visita_id | timestamp | lead_id | telefono | nombre | property_id | fecha | hora | estado | calendar_event_id`

### `Incidentes`

`fecha | workflow | nodo | tipo_error | mensaje | telefono | resuelto`

## 3. Reemplazar placeholders

En `⚙️ CONFIG · Prohausen`:

| Campo | Valor |
|---|---|
| `sheet_id` | ID del Google Sheet |
| `calendar_id` | calendario del equipo comercial |
| `email_corredor` | correo que recibe alertas |
| `whatsapp_phone_number_id` | Phone Number ID de Meta |
| `graph_api_version` | versión Graph API vigente en la cuenta |
| `openai_model` | modelo de Chat Completions habilitado en la cuenta |

En `GET · ¿Token válido?`, reemplazar `REEMPLAZAR_VERIFY_TOKEN`.

## 4. Credenciales n8n

Asignar:

- Google Sheets OAuth2;
- Google Calendar OAuth2;
- Gmail OAuth2;
- OpenAI API;
- WhatsApp Cloud API.

Los secretos no deben subirse al repositorio.

## 5. Pruebas

1. Importar el workflow.
2. Mantenerlo desactivado.
3. Completar placeholders y credenciales.
4. Ejecutar en modo test.
5. Probar GET de Meta:

```bash
curl "https://TU_N8N/webhook-test/prohausen-whatsapp-v1?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=12345"
```

6. Probar el payload de `tests/prohausen/payload-mensaje-compra.json`.
7. Repetir el mismo payload: debe terminar en `Fin · Mensaje duplicado`.
8. Verificar que no recomienda propiedades que no estén en `CatalogoPropiedades`.
9. Probar venta/publicación: debe enviar alerta al corredor.
10. Probar solicitud de visita con `property_id`, fecha y hora válidos.
11. Simular error de OpenAI y comprobar la fila en `Incidentes`.

## 6. Criterios antes del piloto

- verificación GET segura;
- deduplicación funcionando;
- catálogo sin datos sensibles;
- respuestas con máximo tres propiedades;
- puntaje y clasificación registrados;
- captaciones y leads calientes derivados;
- visitas quedan como “pendientes de validación”;
- opt-out deja estado `NO_CONTACTAR`;
- el workflow sigue desactivado hasta aprobación.
