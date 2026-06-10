# Refactorización del Sistema de Autenticación

## El Problema Raíz

El sistema actual creó cuentas falsas en Supabase Auth para **todos** los usuarios del laboratorio (ej: `douglas@lablegion.com`, `nilda@lablegion.com`). Esto causa que:
- Cambiar contraseñas sea frágil (el email falso puede desincronizarse)
- Los usuarios de producción (que solo necesitan un PIN de 4 dígitos) pasen por un sistema diseñado para correos reales

## La Arquitectura Correcta

```
SuperAdmin (Coloratura)     → Supabase Auth con email real     → /saas
Lab Admin/Owner (Legion)    → Supabase Auth con email real     → /admin
Usuarios del Lab            → tabla `usuarios` con hash bcrypt → / (producción) o /admin
```

## Usuarios Afectados

| Usuario | Tipo | Cambio |
|---|---|---|
| `admin@coloratura.com` | SuperAdmin | ✅ Sin cambio, ya usa email real |
| `Legion` | Lab Owner | ✅ Sin cambio, ya usa `legion@lablegion.com` real |
| `Admin` | Staff Admin | 🔄 Deja de usar Supabase Auth, usa hash en `usuarios` |
| `Douglas` | Producción | 🔄 Deja de usar Supabase Auth, usa hash en `usuarios` |
| `Nilda` | Producción | 🔄 Deja de usar Supabase Auth, usa hash en `usuarios` |
| `Vannesauria` | Producción | 🔄 Deja de usar Supabase Auth, usa hash en `usuarios` |

---

## Cambios Propuestos

### Base de Datos (Supabase)

#### [MODIFY] tabla `usuarios`
- Agregar columna `password_hash TEXT` (nullable) — solo la usan los usuarios del lab que **no** son Lab Owner
- Los usuarios que usan Supabase Auth dejan `password_hash` en NULL

#### Limpiar cuentas fantasma de Supabase Auth
- Eliminar de Supabase Auth: `admin@lablegion.com`, `douglasvaldez@lablegion.com`, `nilda@lablegion.com`, `vannesauria@lablegion.com`, `autenticador@legion.com`
- Mantener: `admin@coloratura.com`, `legion@lablegion.com`

---

### `/src/lib/auth.js`

#### [MODIFY] `loginUser(username, password)` 
- **Antes**: busca el usuario en `usuarios`, luego hace `signInWithPassword` con `username@lablegion.com`
- **Después**: 
  1. Busca el usuario en `usuarios`
  2. Si `password_hash` existe → compara con `bcrypt.compare()`. Si coincide, crea una cookie de sesión local (`lab_os_user` + `lab_os_lab_id`). **No usa Supabase Auth en absoluto.**
  3. Si `password_hash` es null → es Lab Owner, usa Supabase Auth con su email real

#### [MODIFY] `getCurrentUser()`
- **Antes**: solo usa el token JWT de Supabase Auth (`lab_os_ghost` cookie)
- **Después**: 
  1. Revisa si existe cookie `lab_os_user` (sesión local para usuarios del lab)
  2. Si existe → busca el usuario en la tabla `usuarios` y lo devuelve directamente (sin JWT)
  3. Si no → revisa `lab_os_ghost` para el Lab Owner via Supabase Auth (flujo actual)

#### [MODIFY] `logoutUser()`
- Elimina cookies `lab_os_user`, `lab_os_ghost`, `lab_os_lab_id`
- Llama a `supabase.auth.signOut()` solo si había sesión de Supabase

#### [MODIFY] `createUserInSystem(username, passwordOrPin, rol, avatarBase64)`
- **Antes**: crea cuenta en Supabase Auth + fila en `usuarios`
- **Después**: 
  1. Hashea `passwordOrPin` con `bcrypt`
  2. Inserta solo en `usuarios` con `password_hash`
  3. **No crea cuenta en Supabase Auth**

#### [MODIFY] `updateUserInSystem(id, username, passwordOrPin, rol, avatarBase64)`
- **Antes**: busca cuenta en Supabase Auth por email falso y actualiza ahí
- **Después**: 
  1. Si hay nueva contraseña → la hashea con bcrypt y actualiza `password_hash` en `usuarios`
  2. Actualiza `username`, `rol`, `avatar_base64` en `usuarios`
  3. **No toca Supabase Auth**

#### [MODIFY] `deleteUserInSystem(id, username)`
- **Antes**: elimina de `usuarios` + elimina cuenta de Supabase Auth
- **Después**: solo elimina de `usuarios` (ya no hay cuenta Auth que borrar)

---

### `/src/app/page.js`

#### [MODIFY] Flujo de actualización de token
- Eliminar la llamada a `refreshGhostToken()` para usuarios del lab (ellos no tienen JWT)
- Mantener solo para el Lab Owner

---

## Dependencias a Instalar

```bash
npm install bcryptjs
```
`bcryptjs` es puro JavaScript y funciona en el entorno de servidor de Next.js sin problemas.

---

## Open Questions

> [!IMPORTANT]
> **Contraseñas actuales:** Al migrar, las contraseñas existentes de los usuarios del lab (Douglas, Nilda, etc.) que están en Supabase Auth **NO se pueden recuperar** (están hasheadas en el sistema de Supabase). Necesitarás resetearlas manualmente desde Gestión de Usuarios una vez que se implemente el nuevo sistema. ¿Estás de acuerdo con eso?

> [!IMPORTANT]
> **¿Cuánto tiempo sesiona un usuario del lab?** Actualmente las sesiones duran 30 días. ¿Prefieres que la sesión expire al cerrar el navegador, o que se mantenga por días?

---

## Verificación

1. Iniciar sesión como Douglas con su nuevo PIN → debería entrar en producción
2. Iniciar sesión como Legion con su contraseña → debería ir a `/admin`
3. Cambiar la contraseña de Nilda desde Gestión de Usuarios → el cambio debe ser inmediato
4. Cerrar sesión → debe limpiar completamente y no volver a entrar automáticamente
