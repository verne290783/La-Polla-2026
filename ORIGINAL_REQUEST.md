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
