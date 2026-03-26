# 🦷 Lab OS — Contexto Maestro para IA

> Usa este archivo para llevar a cualquier AI (LM Studio, Gemini, ChatGPT, etc.) al corriente del proyecto.
> Última actualización: 2026-03-25 — Checkpoint `estable-v1-rls-completo`

---

## ¿Qué es Lab OS?

Sistema de gestión operativa para **Legion Dental Lab**. Consta de dos aplicaciones sincronizadas:

| App | Tecnología | URL / Ubicación |
|-----|-----------|-----------------|
| **Web OS** | Next.js 16 + Supabase | https://os.legiondentallab.com |
| **Desktop App** | Python + Tkinter + Supabase | `C:\Users\legio\iCloudDrive\Desktop\programa\trabajos_app.py` |
| **Base de datos** | Supabase (PostgreSQL + RLS) | `https://etnfvmpywgbeqvbyieze.supabase.co` |

---

## Arquitectura de Seguridad

### Ghost User (Usuario Fantasma)
- La Web OS usa un usuario especial de solo lectura para que todos los usuarios puedan ver los casos sin una cuenta individual.
- **Email:** `autenticador@legion.com`
- **Variables de entorno** (Vercel + `.env.local`):
  - `GHOST_USER_EMAIL`
  - `GHOST_USER_PASSWORD`

### Row Level Security (RLS)
- La tabla `casos_master` tiene RLS activado.
- Los **GET** (lecturas) pasan por el Ghost User JWT almacenado en un cookie HTTP-only (`lab_os_ghost`).
- Los **WRITE** (mutaciones: iniciar, pausar, terminar) usan el **Admin Client** con la Service Role Key — esto bypassa RLS de forma segura desde el servidor.

### Variables de Entorno Críticas

```
NEXT_PUBLIC_SUPABASE_URL=https://etnfvmpywgbeqvbyieze.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_***   ← En Vercel y .env.local
SUPABASE_SERVICE_ROLE_KEY=sb_secret_***            ← Solo en Vercel (no en el repo)
GHOST_USER_EMAIL=autenticador@legion.com
GHOST_USER_PASSWORD=***                            ← Solo en Vercel y .env.local
```

---

## Estructura de Archivos Clave (Web OS)

```
src/
├── app/
│   ├── page.js                  ← Dashboard principal (UI completa, "use client")
│   ├── api/
│   │   └── cases/route.js       ← GET de casos con ghost cookie
│   └── actions/
│       ├── cases.js             ← updateCaseState (START/PAUSE/COMPLETE) — admin client
│       ├── create-case.js       ← createNewCase — registro de casos
│       ├── products.js          ← getProducts — catálogo de materiales
│       ├── clients.js           ← getClients
│       └── receipts.js          ← generateReceipt
└── lib/
    ├── supabase.js              ← Cliente anon (browser-safe, sin next/headers)
    └── auth.js                  ← loginUser, logoutUser, getCurrentUser, getAllUsers
```

> ⚠️ **REGLA CRÍTICA**: `src/lib/supabase.js` NO debe importar `next/headers` jamás. 
> Eso solo va dentro de archivos `"use server"`.

---

## Flujo de Departamentos

### Digital
`Recepción → Digital_Diseno → Digital_Fresado → [Sinterizado si Zr] → Ajuste → Terminado → Inspección → Recibo/Factura → Empaquetado → Envío`

### Análogo
`Recepción → Yesos → Digital_Escaneo → Digital_Diseno → Digital_Fresado → Sinterizado → Ajuste → Terminado → ...`

> ⚡ Si el caso sale de `Digital_Fresado` y NO tiene material Zirconia/ZR, salta directamente a `Ajuste` (bypassa Sinterizado).

---

## Tablas Principales en Supabase

| Tabla | Descripción |
|-------|-------------|
| `casos_master` | Registro principal de cada caso. Columnas clave: `id`, `folio`, `depto_actual`, `estado`, `tipo`, `operador_actual`, `hora_inicio` |
| `casos_detalle` | Productos/trabajo de cada caso. Columna clave: `producto`, `caso_id` |
| `productos` | Catálogo de materiales. Columnas: `nombre`, `categoria` |
| `clientes` / `doctores` | Base de clientes y doctores referentes |
| `usuarios` | Usuarios del sistema con `rol` y `depto` asignados |

---

## Desktop App (Python)

- **Archivo:** `trabajos_app.py`
- **Variables de entorno:** Lee un archivo `.env` en el mismo directorio (parser nativo, sin `python-dotenv`)
- **Conexión:** `supabase-py` con la Anon Key (lee `casos_master`)
- **Advertencia de linting:** Hay ~200 errores de tipo de Pylance. Son inofensivos para la ejecución; son falsos positivos de tipos dinámicos de Tkinter + Supabase.

---

## Checkpoint de Recuperación

Si algo se rompe, recupera el sistema estable con:

```bash
# Regresar al checkpoint estable
git checkout estable-v1-rls-completo

# O ver qué commit es
git show estable-v1-rls-completo --stat
```

**Commit del checkpoint:** `7a5a5e4` (tag: `estable-v1-rls-completo`)

---

## Estado al momento del checkpoint

- ✅ Login / Logout funcionando
- ✅ Casos visibles en dashboard (todos los departamentos)  
- ✅ Iniciar / Pausar / Terminar proceso → cambia `depto_actual` y `estado` en DB
- ✅ Modal de registro de nuevo caso abre y guarda
- ✅ Descarga/subida de archivos STL/PLY
- ✅ Generación de recibos/facturas
- ✅ Desktop App (Python) lee y muestra casos
- 🟡 Linting de `trabajos_app.py` tiene errores de tipo (no bloquean ejecución)
