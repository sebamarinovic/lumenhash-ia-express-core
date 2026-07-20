# Casos de prueba — Bot WhatsApp v2

Convenciones: teléfono de prueba `569XXXXXXXX` ficticio; "rama" = salida esperada del Switch o punto de término; payloads base en `DATOS_DE_PRUEBA.json`. Un caso se aprueba si la ejecución termina sin errores no controlados, la rama es la esperada, los datos indicados quedan guardados y la respuesta cumple el criterio.

| # | Caso | Entrada | Estado previo | Rama esperada | Debe guardarse | Respuesta esperada / criterio |
|---|------|---------|---------------|---------------|----------------|-------------------------------|
| 1 | Saludo inicial | "Hola! ¿Qué tortas tienen?" | Sin fila en EstadoConversacion | default | wamid; fila nueva de estado (INICIO/NAVEGANDO) | Saluda 1 sola vez, ofrece categorías, ≤5 líneas |
| 2 | Consulta horario | "¿A qué hora abren?" | Cualquiera | default | Estado actualizado | Horarios correctos (09:00–21:30 por franjas) |
| 3 | Consulta dirección | "¿Dónde están?" | Cualquiera | default | Estado | "Rancagua 3421, Iquique", solo retiro en local |
| 4 | Consulta producto | "¿Qué lleva la torta Alpina?" | Cualquiera | default | Estado | Descripción real de la carta, sin inventar |
| 5 | Pedido sencillo | "Quiero un pie de limón" | INICIO | default | pedido_actual con 1 ítem, precio $5.000 | Pide fecha/hora/nombre antes de confirmar |
| 6 | Pedido múltiple | "2 croissants Roma y una limonada" | NAVEGANDO | default | pedido_actual 3 ítems, total correcto | Total recalculado en código = suma exacta |
| 7 | Torta < 24 h | "Torta Silvestre 10p para hoy, confirmo" | Con nombre | default (confirmación bloqueada) | pedido sin confirmar | Rechaza por anticipación, ofrece alternativa |
| 8 | Pedido sin nombre | "Confirmo el pedido" (sin nombre previo) | ARMANDO_PEDIDO | default (bloqueada) | Sin fila en Pedidos | Pide el nombre |
| 9 | Pedido sin fecha | "Confirmo" (sin fecha previa) | DATOS_CLIENTE | default (bloqueada) | Sin fila en Pedidos | Pide la fecha |
| 10 | Pedido sin hora | "Confirmo" (sin hora previa) | DATOS_CLIENTE | default (bloqueada) | Sin fila en Pedidos | Pide la hora |
| 11 | Confirmación explícita completa | "Confirmo" (nombre+fecha+hora+productos OK) | CONFIRMACION | **pedido_confirmado** | Fila en Pedidos con codigo_pedido; evento Calendar en fecha/hora correctas; correo | Confirmación al cliente con resumen |
| 12 | Cancelación | "Mejor cancela todo" | ARMANDO_PEDIDO | default | pedido_actual vacío | Confirma cancelación amable |
| 13 | Reprogramación | "¿Puedo cambiarlo para el sábado?" | COMPLETADO | default o escalar | Estado actualizado; nota_interna | Gestiona el cambio o escala (pedido ya registrado) |
| 14 | Cliente molesto | 2+ mensajes de reclamo seguidos | Cualquiera | **escalar_humano** | nota_interna con motivo | Correo alerta + respuesta empática |
| 15 | Alergia grave | "Alergia grave al maní..." | Cualquiera | **escalar_humano** | nota_interna | No da garantías; escala |
| 16 | Audio recibido | payload type=audio | Cualquiera | default | wamid registrado | Pide amablemente que escriba en texto |
| 17 | Imagen recibida | payload type=image | Cualquiera | default | wamid registrado | Ídem 16 |
| 18 | Mensaje duplicado | Mismo payload 2 veces (mismo wamid) | — | Fin · Mensaje duplicado | Sin filas nuevas | 2ª ejecución no responde ni escribe nada |
| 19 | Payload sin messages | payload de status delivered | — | Fin · Payload descartado | Nada | Sin error, sin respuesta |
| 20 | Error de OpenAI | Credencial OpenAI inválida (entorno de prueba) | Cualquiera | Error IA | Fila en Incidentes | Cliente recibe mensaje de problema técnico |
| 21 | Error de Sheets | sheet_id inválido temporal | Cualquiera | continúa con onError | Ejecución no aborta | Cliente igual recibe respuesta |
| 22 | Error de Calendar | calendar_id inválido temporal | Pedido confirmado | continúa | Fila en Pedidos SÍ existe | Correo y WhatsApp igual salen |
| 23 | Error de WhatsApp | phone_number_id inválido | Cualquiera | nodo WA falla con reintento | Ejecución registra el error | Reintenta 2 veces; no duplica registros |
| 24 | Fecha pasada | "Para ayer" / fecha < hoy | CONFIRMACION | default (bloqueada) | Sin Pedido | Rechaza y pide fecha futura |
| 25 | Fuera de horario | "Retiro a las 23:00" | CONFIRMACION | default (bloqueada) | Sin Pedido | Indica horario 09:00–21:30 |
| 26 | "¿Eres un bot?" | "¿Eres un robot?" | Cualquiera | default | Estado | "Soy Dulce..." sin mencionar IA/modelos |
| 27 | Segundo mensaje | Cualquier texto con historial previo | Historial existente | default | Historial crece | NO empieza con "Hola" |
| 28 | Cambio de producto | "Mejor que sea la Mocca" | ARMANDO_PEDIDO | default | pedido_actual reemplazado | No repite la lista completa |
| 29 | Tamaño inexistente | "Torta para 30 personas" | Cualquiera | default | Estado | Sugiere 2 tortas de 15/20 |
| 30 | Mensajes rápidos | 2 mensajes distintos en <5 s (wamid distintos) | Cualquiera | default ×2 | 2 wamid registrados | Ambos procesados; estado consistente (ver nota) |

**Nota caso 30:** dos ejecuciones simultáneas pueden leer el mismo estado antes de que la otra escriba (condición de carrera conocida del MVP con Sheets). Mitigación futura P2: cola/lock o PostgreSQL. Registrar el comportamiento observado.

**Casos 20–23:** simular solo en entorno de prueba (Sheet de prueba, credenciales de prueba), nunca contra producción.
