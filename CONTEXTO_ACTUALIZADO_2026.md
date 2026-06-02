# 🦷 Lab OS — Documento de Contexto Maestro Actualizado
**Versión:** Junio 2026 | **Estado:** 100% Web en Producción

Este documento es la **única fuente de verdad** actual del sistema Lab OS. **Reemplaza y anula** cualquier documento anterior. 
> ⚠️ **AVISO CRÍTICO PARA IAs:** La aplicación de escritorio en Python (`trabajos_app.py`) y SQLite **HAN SIDO DEPRECADAS Y ABANDONADAS**. El sistema ha evolucionado y ahora es una aplicación **100% Web** en la nube.

---

## 1. Descripción General del Proyecto

**Lab OS** es un sistema integral de gestión operativa y de producción para **Legion Dental Lab**. Controla todo el ciclo de vida de los trabajos dentales (prótesis, coronas, implantes, etc.), desde la recepción hasta la facturación y envío, midiendo tiempos de manufactura (SLA).

### Tech Stack Actual (Herramientas Core)
| Capa | Tecnología | Descripción / Propósito |
|---|---|---|
| **Frontend / Framework** | **Next.js 16 (App Router)** | Framework principal. Renderizado híbrido (SSR/CSR). |
| **Estilos e UI** | **Tailwind CSS + Framer Motion** | Utilidades CSS para diseño responsive y animaciones fluidas. |
| **Componentes UI** | **Lucide-React & Sonner** | Íconos limpios y sistema de notificaciones (Toasts). |
| **Backend / Base de Datos** | **Supabase (PostgreSQL)** | Base de datos relacional en la nube. Maneja la persistencia, FKs y realtime. |
| **Hosting & CI/CD** | **Vercel** | Alojamiento de la aplicación web. Despliegues automáticos desde la rama `main` de GitHub. |

---

## 2. Zonas de la Aplicación Web

El sistema web se divide estructuralmente en dos áreas principales para separar la operación técnica de la administración del laboratorio:

### A) Área de Producción (Ruta raíz: `/`)
Es la vista diseñada para los técnicos de laboratorio en sus estaciones de trabajo.
*   **Pizarrón de Trabajo:** Los técnicos ven las tarjetas de los casos filtrados por el departamento en el que se encuentran.
*   **Operación de Tiempos:** Los técnicos usan botones para **Iniciar**, **Pausar** y **Terminar** un caso.
*   **Sistema SLA (Semáforo):** Un cronómetro visual que pinta el borde de la tarjeta del caso (Verde, Amarillo, Rojo) basándose en los minutos permitidos por cada departamento.
*   **Realtime:** La pantalla reacciona a los cambios en la base de datos en tiempo real mediante WebSockets de Supabase.

### B) Área de Administración (Ruta: `/admin`)
Es el centro de mando para los gerentes y administradores del laboratorio.
*   **Pizarrón de "Casos en Curso":** Una tabla de datos completa donde los administradores pueden buscar, filtrar y visualizar todos los casos activos sin importar el departamento.
*   **Creación de Casos ("Nuevo Trabajo"):** Un Modal avanzado con:
    *   Búsqueda de clínicas y doctores en vivo.
    *   **Odontograma interactivo** (FDI de 32 piezas).
    *   Selección de Materiales (Zirconia, Disilicato, etc.) y Productos (Corona, Carilla, etc.).
    *   Enrutamiento automático dependiendo si es un protocolo **Físico (Análogo)** o **Digital**.
*   **Edición y Borrado:** Los administradores pueden editar cualquier campo del caso maestro (estado, depto_actual, fechas, paciente). Tienen el poder de hacer un **Soft Edit** o un **Borrado Permanente** (Cascade delete) del caso.

---

## 3. Base de Datos en Supabase (PostgreSQL)

El sistema funciona con un esquema relacional estricto. Las tablas principales son:

1.  `casos_master`: Tabla central. Guarda la metadata del caso (`id` interno numérico, `codigo` de la orden, `paciente`, `depto_actual`, `estado`, `fecha_entrega`).
2.  `casos_detalle`: Qué se va a fabricar. Relacionada a `casos_master`. (Guarda las unidades, producto y dientes afectados).
3.  `casos_tiempos_historicos`: El log de auditoría y tiempos. Cada vez que un caso entra a un departamento o un técnico lo inicia/pausa, se registra aquí. Vinculado a `casos_master` por la llave foránea `id_caso` (numérica).
4.  `cuenta_corriente_clinica`: Registros financieros.
5.  `clientes`, `doctores`, `productos`: Catálogos maestros de información.

### Autenticación y Seguridad (RLS)
*   Las consultas de solo lectura en el área de producción a veces utilizan un enfoque de **"Ghost User"** (autenticador) para facilitar la visualización en pantallas sin login obligatorio de cada usuario, manejado vía Cookies (`lab_os_ghost`).
*   **Mutaciones Server-Side:** Las operaciones de creación, actualización y borrado (ej. `deleteAdminCase`, `updateAdminCase`, `createCase`) se ejecutan a través de **Server Actions** de Next.js.
*   Estas Server Actions utilizan el `SUPABASE_SERVICE_ROLE_KEY` (llave secreta de Vercel) para crear un **Admin Client** que sobrepasa el Row Level Security (RLS) de forma segura desde el servidor, garantizando que operaciones complejas no sean bloqueadas por políticas de lectura/escritura limitadas.

---

## 4. Flujos de Trabajo (Workflow)

El campo más crítico de la BD es `depto_actual`. El campo `estado` ('Pendiente', 'En Proceso', 'En Pausa', 'Terminado') representa qué está pasando *dentro* de ese departamento.

**Ruta Digital:**
`Recepción` → `Digital_Diseno` → `Digital_Fresado` → `Sinterizado` (solo si es Zirconia) → `Ajuste` → `Terminado` → `Inspección` → `Empaquetado` → `Envío` → `Facturación`.

**Ruta Análoga (Física):**
Igual que la digital, pero al entrar desde Recepción, debe pasar primero por `Yesos` → `Digital_Escaneo` antes de entrar a Diseño.

---

## 5. Detalles Técnicos Críticos Recientes (Aviso para la IA)

1.  **Borrado en Cascada (Cascade Delete):** Debido a que la base de datos de Supabase protege la integridad referencial, para borrar un `casos_master` en el panel de `/admin`, el servidor ejecuta una limpieza manual agresiva previa en `casos_detalle`, `cuenta_corriente_clinica` y `casos_tiempos_historicos`.
    *   **Nota técnica:** En `casos_tiempos_historicos`, la columna de relación foránea se llama **`id_caso`** (tipo entero, enlaza al `id` interno del caso).
2.  **Despliegues en Vercel:** Al hacer cambios al código, un simple `git push origin main` detona la compilación en Vercel. Si los cambios no se reflejan, verificar siempre en la consola web de Vercel que no haya "Deployments Queued" trabados.
3.  **UI/UX Premium:** La estética es clave en Lab OS. Se exige el uso de paletas de colores armoniosas (ej. detalles en dorado `#D4AF37`), esquinas redondeadas modernas (`rounded-xl`, `rounded-2xl`), *glassmorphism* y micro-animaciones (con Framer Motion o utilidades de Tailwind) para mantener una calidad Premium.

---
**Fin del Contexto**
Si eres un asistente IA leyendo esto, asegúrate de ignorar cualquier código viejo de Python/SQLite o arquitecturas que no incluyan Next.js y Supabase Web.
