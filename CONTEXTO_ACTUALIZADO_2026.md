# 🦷 Lab OS — Contexto Maestro 2026

Sistema de gestión operativa para **Legion Dental Lab**.
Desarrollado por Douglas Valdez. Repo: `dougvaldez10/lab-os-web`

## Stack
- **Frontend:** Next.js (App Router), Tailwind CSS
- **Backend:** Supabase (PostgreSQL + RLS)
- **Hosting:** Vercel — `https://os.legiondentallab.com`
- **Regla de oro:** `src/lib/supabase.js` es cliente únicamente, NUNCA importar `next/headers`
- **Operaciones privilegiadas:** siempre via Admin Client (Service Role Key) en Server Actions

## Arquitectura de seguridad
- Ghost User (`autenticador@legion.com`) para lectura pública sin cuenta
- RLS activo en `casos_master`
- Lecturas via ghost cookie `lab_os_ghost`
- Escrituras via Admin Client que bypassa RLS

## Schema real confirmado en BD

### `casos_master` — 24 columnas
```
id, codigo, cliente_id, paciente, total_caso, estado, edad, color,
comentarios, fecha_ingreso, fecha_entrega, hora_entrega, doctor, tipo,
depto_actual, usuario_id, folder_path_base, operador_actual, hora_inicio,
estado_pago, saldo_pendiente, iva_aplicado, descuento, laboratorio_id,
fecha_envio_real, fecha_cobro, promesa_pago_fecha
```
- `total_caso` — valor original del caso, nunca se modifica
- `saldo_pendiente` — se resta con cada abono
- `estado_pago` — CHECK constraint: solo `'Pendiente'` o `'Pagado'`
- `estado` — valores en producción: `'Pendiente'`, `'En Proceso'`, `'En Pausa'`, `'Terminado'`, `'Finalizado'`, `'Enviado'`, `'Cancelado'`
- `fecha_envio_real` — se llena al marcar enviado (no sobreescribe `fecha_entrega`)
- `fecha_cobro` — jueves de la semana siguiente al envío (calculado automáticamente)
- `promesa_pago_fecha` — fecha acordada con el cliente para pagar

### `pagos_historico` — 12 columnas
```
id (BIGINT), id_caso, cliente_id, monto_abono, metodo_pago, fecha_pago,
creado_por, comprobante_url, notas, tipo_movimiento, referencia_reversion_id, motivo
```
- `tipo_movimiento` — `'abono'` (default) o `'reversion'`
- `referencia_reversion_id` — BIGINT FK a `pagos_historico.id`
- `id` es BIGINT (no UUID) — cualquier FK debe ser BIGINT

### `casos_detalle` — 8 columnas
```
id, caso_id, producto, dientes, unidades, precio_unit, subtotal, laboratorio_id
```
- Inmutable después de creación — fotografía del momento de creación

### `clientes` — 16 columnas
```
id, nombre, responsable, rfc, datos_facturacion, tel_fijo, tel_celular,
tel_whatsapp, direccion, colonia, cp, ciudad, email, usuario_id,
laboratorio_id, saldo_favor
```
- `saldo_favor` — saldo a favor del cliente, se suma al cancelar casos con abonos

### `recibos` — 10 columnas
```
id, caso_id, subtotal, descuento_tipo, descuento_valor, iva_aplicado,
monto_iva, total, created_at, laboratorio_id
```

### `casos_tiempos_historicos` — 9 columnas
```
id, id_caso, departamento, hora_llegada, hora_inicio, hora_termino,
minutos_totales, laboratorio_id, departamento_siguiente
```

### `usuarios` — roles reales
- El campo `rol` es un string con departamentos separados por coma
- Valores de control de acceso: `lab_owner`, `Administrativo`
- NO existen roles `'admin'`, `'finanzas_admin'` como entidades separadas
- Control de acceso: `user?.rol?.includes('lab_owner') || user?.rol?.includes('Administrativo')`

## Flujos de producción

### Flujo Digital
`Recepción → Digital_Escaneo → Digital_Diseno → Digital_Fresado → [Sinterizado si Zirconia] → Ajuste → Terminado → Inspección → Recibo/Factura → Empaquetado → Envío → Facturación`

### Flujo Análogo
`Recepción → Yesos → Digital_Escaneo → Digital_Diseno → Digital_Fresado → Sinterizado → Ajuste → Terminado → Inspección → Recibo/Factura → Empaquetado → Envío → Facturación`

## Módulos implementados

### Módulo Financiero (`billing.js`)
- `revertirPago({ caso_id, motivo })` — reversión total del último abono directo (30 días), inserta registro negativo en `pagos_historico`, solo `lab_owner` o `Administrativo`
- `calcularFechaCobro(fechaEnvioStr)` — calcula el jueves de la semana siguiente
- `markCaseAsSent(id_caso)` — llena `fecha_envio_real`, `fecha_cobro`, `estado='Enviado'`. NO toca `fecha_entrega`
- `getBillingSummary()` — retorna `cobrosSemana.porCobrar`, `cobrosSemana.proximamente`, `deudaGeneral`
- `registrarPromesaPago({ caso_id, fecha_promesa })` — actualiza `promesa_pago_fecha`

### Módulo Recibos (`receipts.js`)
- Usa Admin Client (ya corregido)
- `saveReceiptData(casoId, payload)` — guarda en BD sin mover estado del caso
- `getReceiptByCaseId(casoId)` — para reimpresión desde historial
- Componente `ThermalReceipt.js` — impresión térmica 80mm con `@media print`

### Módulo Cancelación (`admin-cases.js`)
- `cancelarCaso({ caso_id, motivo })` — marca `estado='Cancelado'`, `estado_pago='Pendiente'` (por CHECK constraint), transfiere abonos previos a `clientes.saldo_favor`

## Reglas de negocio financieras
- Semana laboral: lunes a viernes
- Caso enviado → `fecha_cobro` = jueves de la semana siguiente
- Vista CxC tiene sub-tabs: "Cobros de esta semana" y "Deuda General"
- "Cobros de esta semana" filtra clínicas que tienen `fecha_cobro` en la semana actual
- Dentro de cada clínica: zona "Por cobrar" (`fecha_cobro <= hoy`) y "Próximamente" (`fecha_cobro > hoy`)
- Semáforo: 🟢 promesa futura vigente / 🟡 promesa vence hoy / 🔴 sin promesa o vencida
- Reversión: solo abonos directos (`id_caso IS NOT NULL`), máximo 30 días, no reversible dos veces
- Cancelación: `estado_pago` queda en `'Pendiente'` (CHECK constraint no permite `'Cancelado'`)

## Features diseñados — pendientes de implementar

### Buscador global Ctrl+L
- Atajo `Ctrl+L` → overlay con `backdrop-filter: blur(8px)`
- Busca por: folio, paciente, doctor, nombre de clínica
- Resultados agrupados: En producción / Pendiente envío / Pendiente pago / Histórico (colapsado)
- Clic en resultado → redirige a página correspondiente ya filtrada
- Accesible para todos los roles

### Screensaver / modo idle
- Activa `Fullscreen API` a los 5 minutos de inactividad
- Ciclo: 5 minutos reloj + fecha + clima → 8 segundos notificaciones/métricas → repite
- Estilo split-flap (efecto tablero de aeropuerto) en todos los elementos
- Métricas de productividad: opcionales, activables desde sección Configuración
- `mousemove` o `keydown` → cierra fullscreen y regresa a Lab OS

### Cobro en campo
- Usuario con rol `Representante` ve saldo del cliente desde móvil
- Selecciona casos a pagar, registra monto → notificación al admin via Supabase Realtime
- Admin confirma y aplica distribución
- Tabla nueva: `cobros_propuestos` con estados: `propuesto | confirmado | aplicado | rechazado`

### Portal del dentista (horizonte futuro)
- Dashboard por clínica: casos en tiempo real, saldo, deuda, historial clínico
- Archivos por paciente (STL, PLY, radiografías)
- Pagos en línea via Stripe
- El buscador Ctrl+L y la vista CxC son la base de esto

## Secciones pendientes de crear
- **Métricas** — ya existe en el sistema, pendiente definir KPIs con el equipo
- **Configuración** — nueva sección para opciones del screensaver y otras preferencias del sistema

## Principios de desarrollo
- **No borrar datos** — reversiones y cancelaciones usan registros de auditoría y flags de estado
- **Admin Client obligatorio** en todas las Server Actions que escriben a la BD
- **Casos cancelados** deben filtrarse con `.neq('estado', 'Cancelado')` en todas las queries activas
- **Upfront design** — diseñar completamente antes de implementar
