# Original User Request

## Initial Request — 2026-06-11T18:10:30-05:00

Corregir el bug de propagación de valores NULL en la función de base de datos `compute_points` y en el archivo `calculate_points.sql` para asegurar que los usuarios que no tienen predicciones de campeón (Parte 1) sumen correctamente sus puntos de la Parte 2.

Working directory: c:\Users\Edison\Desktop\LaPolla
Integrity mode: development

## Requirements

### R1. Corrección de la función SQL compute_points
- Modificar la función `compute_points` en `calculate_points.sql` para agregar validaciones de nulidad (`IF v_bonus IS NULL THEN v_bonus := 0; END IF;`) en todas las variables que se asignen mediante sentencias `SELECT INTO` regulares que puedan retornar 0 filas.
- Asegurar que `part1_points` y `total_points` no queden en `NULL` para usuarios sin registros en `champion_predictions` o `full_tournament_predictions`.

### R2. Aplicar cambios en Supabase y Recalcular
- Aplicar la nueva definición de la función en la base de datos remota de Supabase.
- Ejecutar la función para recalcular las puntuaciones de todos los partidos jugados hasta el momento, corrigiendo de inmediato los puntajes de los usuarios afectados (como Claudia Romero y Addemar Ávila).

## Acceptance Criteria

### Correctness & Calculations
- [ ] El archivo `calculate_points.sql` contiene la lógica corregida libre de propagación de `NULL`.
- [ ] La función corregida está cargada en Supabase.
- [ ] Los usuarios Claudia Romero y Addemar Ávila muestran un puntaje Total de `6` y `3` puntos respectivamente en el Leaderboard (tanto global como de grupo) en lugar de `0`.
- [ ] La aplicación compila de forma limpia y pasa todas las pruebas locales (`npm run build` y `scripts/run-e2e-tests.ts`).

## Follow-up — 2026-06-12T08:30:25-05:00

Implementar una solución integral y robusta para la gestión y actualización de resultados en el portal de la Polla 2026. Esto incluye un Panel de Administración exclusivo para el usuario administrador `ehdiazs@gmail.com` que permita el ingreso manual de marcadores, el recálculo manual de posiciones y el desbloqueo de predicciones de la Parte 1 para usuarios individuales, además de mejorar la tolerancia a fallos del mecanismo de sincronización automática.

Working directory: c:\Users\Edison\Desktop\LaPolla
Integrity mode: development

## Requirements

### R1. Restricción y Pestaña de Administración en el Dashboard
- Agregar una pestaña de "Admin" (Panel de Control) en el menú lateral y móvil del Dashboard.
- Esta pestaña debe ser visible **únicamente** para el usuario administrador con el email `ehdiazs@gmail.com` (o que tenga `is_admin = true` en su perfil).
- Reemplazar el componente vacío `src/components/dashboard/AdminControl.tsx` para renderizar el panel administrativo.

### R2. Edición Manual de Marcadores y Estados de Partidos
- En el panel de administración, mostrar un listado interactivo con todos los partidos del torneo (con buscador o filtros de fase).
- Permitir al administrador modificar y guardar de forma individual los goles reales (`home_score`, `away_score`), el estado del partido (`scheduled`, `live`, `finished`) y el ganador (`winner_team_id` para fases eliminatorias).
- Al guardar un partido como `finished`, se debe disparar el cómputo automático de puntos de los usuarios para ese partido.

### R3. Desbloqueo Individual de Predicciones de la Parte 1 (La Gran Polla)
- Añadir en el panel de administración una sección con el listado de todos los usuarios registrados (con su email y nombre).
- Para cada usuario, mostrar su estado actual de bloqueo de la Parte 1 (Bloqueado/Abierto) y botones para:
  1. **Desbloquear (24 horas)**: Permite a ese usuario específico volver a editar y guardar su predicción completa del bracket (Parte 1) durante 24 horas, incluso si la fecha límite general ya pasó.
  2. **Bloquear de nuevo**: Forzar el bloqueo inmediato del usuario.
- **Base de Datos**:
  - Agregar la columna `p1_unlocked_until` (timestamp con zona horaria) en la tabla `profiles` para gestionar los desbloqueos temporales.
  - Modificar las políticas RLS de `full_tournament_predictions` y `champion_predictions` para permitir edición si la hora actual de la aplicación (`get_app_time()`) es menor a `p1_unlocked_until`.
  - Crear funciones seguras RPC en base de datos (`admin_unlock_user_p1` y `admin_lock_user_p1`) definidas con `SECURITY DEFINER` que verifiquen que el ejecutor sea administrador antes de aplicar los cambios en la BD.
- **Frontend**:
  - Modificar `FixtureTab.tsx` para que, si el perfil del usuario tiene una fecha `p1_unlocked_until` vigente, no bloquee la interfaz de edición y permita guardar borradores o bloquear la predicción.

### R4. Sincronización Automática Híbrida y On-Demand
- Implementar un botón "Sincronizar API" en el panel administrativo para gatillar la actualización en el acto.
- Robustecer la lógica en `src/lib/scoreSync.ts` para realizar una sincronización híbrida:
  1. Intentar obtener datos desde `api.football-data.org` usando la API key en las variables de entorno.
  2. Si hay error o límite de cuota, usar como fallback `worldcup26.ir`.
  3. Si ambas fallan, registrar el error y mostrarlo en la interfaz del admin de forma controlada.
- Programar una tarea cron nativa en la base de datos de Supabase usando la extensión `pg_cron` (o `pg_net`) que llame automáticamente a `/api/cron/sync-scores` con el `CRON_SECRET` cada 10 minutos.

### R5. Recálculo Manual de Puntos
- Agregar un botón "Recalcular Puntos" en el panel para forzar la ejecución de la función `compute_points` en Supabase para todos los partidos finalizados.

### R6. Preservación Absoluta de Datos de Predicciones Existentes
- **REGLA DE INTEGRIDAD**: No alterar, borrar ni reiniciar bajo ninguna circunstancia los datos de las predicciones ya realizadas por los usuarios existentes en la base de datos (tablas `full_tournament_predictions`, `phase_predictions` y `champion_predictions`). Estos datos son sagrados. Cualquier prueba de cálculo debe realizarse con usuarios nuevos/ficticios o sin sobreescribir las predicciones existentes de usuarios reales.

## Acceptance Criteria

### UI & UX (Admin Panel)
- [ ] La pestaña "Admin" solo aparece para `ehdiazs@gmail.com`.
- [ ] La lista de partidos permite cambiar marcador, estado y ganador y guardarlos.
- [ ] La lista de usuarios muestra los botones para Desbloquear (24h) y Bloquear.
- [ ] Los botones de Sincronización y Recálculo tienen estados de carga y feedback visual claro.

### Lógica y Base de Datos
- [ ] Cuando un usuario es desbloqueado por el admin, su pantalla de La Gran Polla (Parte 1) se habilita inmediatamente para edición, y puede guardar cambios con éxito.
- [ ] Cuando la fecha de desbloqueo expira o se vuelve a bloquear, el usuario ya no puede guardar cambios y ve su predicción bloqueada.
- [ ] Durante el periodo de desbloqueo de un usuario, el resto de los participantes no pueden ver sus predicciones en las tablas o modales de posiciones para evitar copia/trampa.
- [ ] La sincronización de API funciona de forma transparente usando el fallback si la primera API no responde.
- [ ] La aplicación Next.js compila limpiamente (`npm run build`).

## Verification Plan

### Automated Tests
- Ejecutar `npx tsx scripts/run-e2e-tests.ts` para verificar la estabilidad de los componentes existentes.
- Probar la compilación y tipado completo mediante `npm run build` y `npm run lint`.

### Manual Verification
- Iniciar sesión como `ehdiazs@gmail.com`, confirmar la visualización de la pestaña Admin.
- Iniciar sesión como un usuario regular, verificar que no se muestra la pestaña Admin.
- Desbloquear un usuario de prueba en el panel Admin y confirmar que dicho usuario puede modificar su Parte 1, mientras que un usuario normal no puede y ve "Bloqueado".
- Verificar que las predicciones del usuario desbloqueado no sean visibles para otros usuarios hasta que se bloquee de nuevo.

## Follow-up — 2026-06-12T15:05:50-05:00

Modificar el simulador de reglas y el algoritmo de cómputo de puntos del portal "La Polla" para incluir los goles anotados durante los 30 minutos del periodo suplementario (prórroga) en el cálculo de puntos por goles pronosticados cuando el partido va a prórroga tras un empate en los 90 minutos regulares (únicamente a partir de la ronda de 32 o eliminatorias).

Working directory: c:\Users\Edison\Desktop\LaPolla

## Requirements

### R1. Actualizar el Simulador en la pestaña de Reglas
Modificar RulesTab.tsx para que tanto el texto descriptivo como el cálculo de puntos y mensajes de desglose en el simulador incluyan los goles del periodo suplementario (prórroga) si se produce un empate.

### R2. Verificar y asegurar la lógica en la base de datos (PostgreSQL)
Asegurar que la función public.compute_points en calculate_points.sql considere los goles de los 120 minutos (tiempo regular + prórroga, excluyendo penales) al evaluar los aciertos de goles de los usuarios en partidos de fases eliminatorias.

## Acceptance Criteria

### Simulación
- [ ] El simulador de la pestaña de reglas muestra un desglose de puntos que indica que los goles incluyen la prórroga (si aplica).
- [ ] El texto de ayuda de la fase eliminatoria en el simulador especifica que se evalúan los goles anotados a los 120 minutos (regular + prórroga).

### Base de Datos
- [ ] La función compute_points procesa correctamente los goles finales (incluyendo prórroga) según lo registrado en la tabla matches para los partidos de eliminación.

## Follow-up — 2026-06-12T22:27:49Z

Implementar un mecanismo de sincronización en segundo plano condicional, automático y transparente que se active al cargar el Dashboard si hay partidos activos ya iniciados, controlando la tasa de llamadas a la API a un máximo de una consulta cada 2 minutos en toda la aplicación y deteniendo el polling cuando todos los partidos finalicen.

Working directory: c:\Users\Edison\Desktop\LaPolla
Integrity mode: development

## Requirements

### R1. Tabla de Horarios Verificada (104 Partidos)
El plan de implementación debe incluir una tabla detallada con los 104 partidos, indicando ID, fase, equipos participantes, fecha/hora en formato UTC y la hora local convertida a Bogotá (UTC-5) para permitir una auditoría manual exhaustiva.

### R2. Algoritmo de Sincronización Automática Simplificada (Client-Side Trigger + API Route)
1. **Ruta de API `/api/matches/sync`**:
   - **Paso A: Comprobar la Base de Datos Local**: Consultar si existe algún partido en la base de datos local que cumpla con: `status != 'finished'` y `match_date <= public.get_app_time()`.
   - **Paso B: Retorno rápido sin API externa**: Si la base de datos local devuelve 0 partidos, retornar inmediatamente `{ activeMatchesCount: 0 }`. **No se realiza llamada alguna a la API externa de resultados**.
   - **Paso C: Control de Tasa (Throttle)**: Si hay al menos un partido activo en la BD local, leer `last_sync_time` de `system_settings`. Si la diferencia entre la hora actual de la aplicación (`get_app_time()`) y `last_sync_time` es **menor a 2 minutos**, retornar inmediatamente `{ activeMatchesCount: N, synced: false }` (bloqueando consultas concurrentes innecesarias a la API externa).
   - **Paso D: Sincronización Real**: Si han transcurrido **2 minutos o más** (o no existe registro previo):
     1. Actualizar `last_sync_time` in `system_settings` con `get_app_time()` usando el cliente de Supabase con `service_role`.
     2. Realizar la sincronización llamando a `syncRealScores()` de `@/lib/scoreSync.ts`.
     3. Si algún partido cambió de estado a `'finished'` debido a la sincronización, invocar de forma preventiva el RPC `compute_points(match_id)` para asegurar el recálculo inmediato.
     4. Retornar `{ activeMatchesCount: N, synced: true }`.

2. **Disparador en el Dashboard (`src/app/dashboard/page.tsx`)**:
   - Al cargar el Dashboard, ejecutar la petición de sincronización a `/api/matches/sync` de forma asíncrona.
   - Si la API retorna `{ activeMatchesCount: 0 }`, no iniciar polling.
   - Si la API retorna `{ activeMatchesCount: N }` donde `N > 0`:
     - Iniciar un `setInterval` que realice la petición de sincronización a `/api/matches/sync` cada 2 minutos en segundo plano de manera transparente.
     - Este interval continuará ejecutándose hasta que una petición de sincronización retorne `{ activeMatchesCount: 0 }`, momento en el cual se limpiará el interval (`clearInterval`) y se detendrá el polling.

### R3. Husos Horarios (UTC vs Bogotá)
Asegurar que todas las comparaciones de fechas en el servidor y base de datos utilicen la hora UTC de forma consistente (por ejemplo, comparando Date objects con `.getTime()` u offsets correctos frente a `get_app_time()`), y que en la interfaz (frontend) de usuario se formatee y muestre siempre la hora correspondiente a la zona horaria `'America/Bogota'`.

### R4. Subir Cambios a GitHub
Confirmar que todos los archivos modificados sean subidos a la rama principal (`origin/main`) mediante Git.

## Acceptance Criteria

### Verificación de Horarios
- [ ] La tabla de los 104 partidos con columnas para UTC y Bogotá se encuentra registrada en `implementation_plan.md`.

### Sincronización en Segundo Plano y Límite de Tasa
- [ ] Al cargar el Dashboard, se realiza una llamada asíncrona a la API de sincronización.
- [ ] La API de sincronización verifica primero en la BD local si hay partidos activos iniciados. Si no los hay, responde de inmediato y no se realiza ninguna llamada a la API externa.
- [ ] Si no hay partidos activos iniciados, el Dashboard no inicia ningún polling y retorna inmediatamente.
- [ ] Si hay partidos activos iniciados, el Dashboard establece un polling cada 2 minutos para realizar peticiones de sincronización en segundo plano.
- [ ] La API de sincronización limita las peticiones externas a un máximo de una cada 2 minutos a nivel global mediante `last_sync_time` in the database.
- [ ] Si la API actualiza un partido a `'finished'`, se dispara el recálculo automático de puntos mediante `compute_points(match_id)`.
- [ ] Cuando todos los partidos activos pasan a `'finished'`, el Dashboard detiene y limpia el polling automáticamente.
- [ ] Todas las comparaciones de fecha son consistentes con zonas horarias y el frontend muestra la hora de Bogotá.
- [ ] Todos los cambios se confirman en Git y se suben a GitHub.

## Follow-up — 2026-06-12T18:17:20-05:00

Corregir el error de asignación de puntos en la Parte 1 para partidos que aún no se han jugado (programados), modificando la lógica de cálculo de la base de datos para limpiar los puntos ganados de partidos `'scheduled'` y actualizando el trigger de base de datos para que sea auto-sanable y responda a cualquier cambio de estado o marcador. Sin dañar un solo dato de las predicciones de los usuarios.

Working directory: c:\Users\Edison\Desktop\LaPolla
Integrity mode: development

## Requirements

### R1. Modificar la función `public.compute_points` ([calculate_points.sql](file:///c:/Users/Edison/Desktop/LaPolla/calculate_points.sql))
* Añadir una validación al inicio de la función: si el partido tiene estado `'scheduled'`, establecer `points_earned = null` para ese partido en las tablas `phase_predictions` (Parte 2) y `full_tournament_predictions` (Parte 1).
* Dejar que el flujo continúe hasta el final para que se recalculen y actualicen de forma correcta los totales acumulados en `pool_members` y `profiles` (restando los puntos inválidos).
* Garantizar que no se alteren ni eliminen los datos originales de las predicciones de goles (`predicted_home_score`, `predicted_away_score`, etc.) de los usuarios.

### R2. Actualizar el Trigger `tr_calculate_points` ([calculate_points.sql](file:///c:/Users/Edison/Desktop/LaPolla/calculate_points.sql))
* Redefinir la función del trigger (`calculate_points_on_match_finish()`) para que se ejecute siempre que ocurra un cambio en los campos: `status`, `home_score`, `away_score`, `home_score_90`, `away_score_90`, o `winner_team_id`.
* Esto garantizará que, si un script de prueba o administrador restablece un partido a `'scheduled'`, la base de datos limpiará automáticamente los puntos correspondientes de forma inmediata.

### R3. Recálculo y Limpieza Masiva en la Base de Datos
* Ejecutar una migración o comando SQL que aplique la nueva versión de `calculate_points.sql` y ejecute `SELECT public.compute_points(id) FROM public.matches;` para todos los 104 partidos.
* Esto limpiará los puntos incorrectos de los partidos no jugados (como Match #3 y Match #21) y restablecerá la clasificación acumulada de todos los usuarios a sus valores reales correctos (reflejando únicamente los 3 partidos realmente jugados hasta el momento).

### R4. Subir Cambios a GitHub
Confirmar que todos los archivos modificados sean subidos a la rama principal (`origin/main`) mediante Git.

## Acceptance Criteria

### Integridad de Puntuación
- [ ] La función `compute_points` restablece a `NULL` los puntos de partidos con estado `'scheduled'`.
- [ ] El trigger `tr_calculate_points` se activa ante cualquier cambio en el estado o marcadores del partido (incluyendo la reversión a `'scheduled'`).
- [ ] Después de ejecutar la limpieza masiva, los partidos no jugados (ej. Match #3 y Match #21) tienen `Points: null` en `full_tournament_predictions`.
- [ ] La clasificación de todos los usuarios en el leaderboard refleja de forma exacta únicamente los 3 partidos realmente jugados.
- [ ] Todos los cambios se confirman en Git y se suben a GitHub.

## Follow-up — 2026-06-14T17:46:46Z

Implement a secure password reset system for the tournament portal. Administrators will be able to set or auto-generate a temporary password for any user from the Admin panel, and logged-in users will be able to change their password to a definitive one from their Profile tab.

Working directory: c:\Users\Edison\Desktop\LaPolla
Integrity mode: development

## Requirements

### R1. Admin Password Reset Interface
- Add a "Restablecer Contraseña" button for each user row in the "Usuarios" tab of the Admin panel (src/components/dashboard/AdminControl.tsx).
- Clicking this button must open a modal/dialog showing a secure auto-generated temporary password (e.g., `Polla-XXXX` where `XXXX` is random digits/characters) and a "Copiar" button.
- The administrator must be able to edit this temporary password before confirming.
- Confirming the modal triggers a request to `/api/admin/reset-password` with the target `userId` and the `newPassword`.

### R2. Secure Admin API Endpoint
- Create a Next.js API route at `src/app/api/admin/reset-password/route.ts`.
- The endpoint must verify that the requesting user is authenticated and is an administrator (either has email `ehdiazs@gmail.com` or `is_admin === true` in the `profiles` table). If not, return a `403 Forbidden` response.
- If authorized, use a Supabase client initialized with the server-side `SUPABASE_SERVICE_ROLE_KEY` to update the target user's password in Supabase Auth via `supabase.auth.admin.updateUserById`.
- Ensure proper error handling and return JSON success/error responses.

### R3. User Password Change in Profile
- Add a "Cambiar Contraseña" section in the user's Profile tab (src/components/dashboard/ProfileTab.tsx).
- It must present input fields for the new password and a confirmation of the new password.
- Validate that the password is at least 6 characters.
- Clicking "Actualizar" updates the current user's password using the client-side Supabase authentication (`supabase.auth.updateUser({ password: newPassword })`).
- Show success/error toast notifications or messages inline.

### R4. Design and Styling Integration
- All new UI elements (buttons, modals, input fields, and alerts) must match the existing styling tokens (colors, dark mode theme, typography, glassmorphism, border classes) of the Next.js/Tailwind CSS project.

## Acceptance Criteria

### Administrative Reset
- [ ] A "Restablecer Contraseña" button is displayed for each user in the admin table.
- [ ] Clicking the button displays a modal with an auto-generated temporary password, a copy button, and a confirmation button.
- [ ] Confirming the reset triggers a POST request to `/api/admin/reset-password`.
- [ ] The `/api/admin/reset-password` API route rejects unauthorized or non-admin requests with 403 Forbidden.
- [ ] The API route successfully updates the user's password in Supabase Auth when invoked by a valid admin.

### User Password Change
- [ ] A "Cambiar Contraseña" form is added to the Profile tab.
- [ ] The form prevents submission and shows validation errors if the password is less than 6 characters or if the passwords do not match.
- [ ] Submitting the form successfully calls the Supabase SDK client method `auth.updateUser` to update the logged-in user's password.
- [ ] Clear success/error messages are shown on success or failure.

