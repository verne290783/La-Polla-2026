# Original User Request

## Initial Request — 2026-06-10T13:51:27Z

Reemplazar los emojis de banderas nacionales en la aplicación "La Polla" por imágenes nítidas y dinámicas (utilizando FlagCDN a través del componente TeamFlag) para corregir el soporte en plataformas Windows.

Working directory: c:\Users\Edison\Desktop\LaPolla
Integrity mode: development

## Requirements

### R1. Reemplazo de banderas en FixtureTab
Reemplazar los emojis de banderas nacionales por el componente `TeamFlag` en la pestaña de Fixture (`FixtureTab.tsx`), incluyendo la fase de grupos, tablas de posiciones, clasificación de mejores terceros, cuadro de eliminatorias (Octavos, Cuartos, Semifinal, Final), podio y partidos en vivo.

### R2. Reemplazo de banderas en HomeTab
Reemplazar los emojis de banderas por el componente `TeamFlag` en la pestaña de inicio (`HomeTab.tsx`) en el listado de partidos activos.

### R3. Reemplazo de banderas en ProfileTab
Reemplazar los emojis de banderas por el componente `TeamFlag` en la pestaña de perfil (`ProfileTab.tsx`) en la sección del podio personal (campeón, subcampeón, tercer puesto).

## Acceptance Criteria

### Correctness
- [ ] No debe haber emojis de banderas textuales (ej. 🇲🇽, 🇿🇦) visibles en la interfaz de usuario en las pestañas del dashboard (Fixture, Inicio, Perfil).
- [ ] Todas las banderas deben renderizarse gráficamente como imágenes utilizando el componente `<TeamFlag />`.
- [ ] La aplicación debe compilar de forma limpia (`npm run build` sin errores de compilación o linter).
- [ ] Al seleccionar cualquier fase en el fixture de predicción de la Parte 1 y Parte 2, las banderas deben cargar correctamente desde FlagCDN con un fallback de texto oculto para accesibilidad.

## Follow-up — 2026-06-10T15:12:42Z

Implementar mejoras cosméticas, lógica de borrador de predicciones y ajustes de producción/tiempos límite en la aplicación "La Polla".

Working directory: c:\Users\Edison\Desktop\LaPolla
Integrity mode: development

## Requirements

### R1. Ajuste de Header y Navegación
- **Subtítulo "sabrosa":** En el header principal (esquina superior izquierda, debajo del nombre "La Polla"), colocar la palabra "sabrosa" en minúscula y con un tamaño de fuente pequeño (ej. `text-[10px]`), utilizando un estilo estético y sutil.
- **Renombrar Solapa 3:** Renombrar la solapa "3. Ronda 32" del wizard por "3. Dieciseisavos".

### R2. Botón "Guardar Borrador" en cada pantalla del Wizard (Parte 1)
- En cada paso del wizard de la Parte 1 (Grupos, Tablas, Dieciseisavos, Octavos, Cuartos, Semis/Final), añadir un botón "Guardar Borrador".
- Este botón debe guardar en la base de datos las predicciones actuales de grupos (`p1GroupPreds`) y eliminatorias (`p1KoPreds`) mediante la función `saveP1Predictions`, pero **no** debe bloquear el wizard (debe mantener `is_locked: false` en `champion_predictions` y permitir seguir editando).
- El botón de "Guardar y Bloquear Predicción" en el Paso 7 (Podio) se mantiene para el cierre definitivo.

### R3. Visualización de Grupos Activos en Pantallas de Predicción
- En las cabeceras/ventanas de las pantallas de predicción (tanto Parte 1 como Parte 2), mostrar claramente el listado de grupos activos a los que pertenece el usuario (ej. "Grupos activos: [Grupo A], [Grupo B]").

### R4. Ajuste de Bloqueo de Predicciones y Reglas de la Fase de Grupos
- **Límite Parte 1 (Mundial completo):** Debe bloquearse exactamente 1 hora antes de que empiece el mundial (el partido inaugural MEX vs RSA empieza el 11 de Junio a las 17:00 UTC, por lo tanto el límite es el 11 de Junio a las 16:00 UTC / 12:00 PM ET).
- **Parte 2 (En vivo) - Incluir Fase de Grupos:**
  - Asegurar que la Parte 2 incluya y permita rellenar los partidos de la Fase de Grupos.
  - El límite de bloqueo de cada partido en la Parte 2 es individual: **1 hora antes de su inicio**.
  - Permitir a los usuarios que no participaron en la Parte 1 participar en la Parte 2 en cualquier momento del mundial.
  - Habilitar que los usuarios puedan crear grupos en cualquier momento.
  - Los partidos ya jugados (o con el tiempo límite superado) deben mostrar su resultado real y estar bloqueados para edición.

### R5. Ejecutar Agente de Pruebas
- Lanzar un agente del equipo a probar y auditar de forma E2E las modificaciones implementadas para garantizar la calidad en producción.

## Acceptance Criteria

### UI & UX
- [ ] Debajo de "La Polla" en el header se lee "sabrosa" en tamaño pequeño.
- [ ] La solapa del paso 3 del wizard dice "3. Dieciseisavos".
- [ ] Se muestra un botón "Guardar Borrador" en los pasos 1, 2, 3, 4, 5 y 6 del wizard.
- [ ] En la parte superior de las pantallas de predicciones (Parte 1 y 2) se muestra la lista de grupos activos del participante (por ejemplo, para `ehdiazs@gmail.com` debe listar sus tres grupos).

### Funcionalidad y Reglas
- [ ] Hacer clic en "Guardar Borrador" guarda el estado actual en la base de datos sin bloquear la predicción (el usuario puede refrescar la página y seguir editando).
- [ ] El bloqueo del mundial completo (Parte 1) se activa el 11 de Junio a las 16:00 UTC / 12:00 PM ET.
- [ ] En la Parte 2, los inputs de partidos futuros (incluidos los de fase de grupos) están habilitados para predicción antes de su hora de inicio (menos 1 hora).
- [ ] En la Parte 2, los partidos pasados o que empiezan en menos de 1 hora están deshabilitados (bloqueados) y muestran el resultado real.
- [ ] La aplicación compila limpiamente (`npm run build` sin errores).

## Follow-up — 2026-06-10T15:50:21Z

Corregir el error de duplicados en el guardado de la Parte 1, implementar predicciones independientes por grupo, añadir clasificación (leaderboards) por grupo en la pestaña de Posiciones y forzar el modo de producción (en vivo con hora real).

## Requirements

### R1. Corregir Bug de Guardado de Borradores / Predicciones
- Corregir el error `ON CONFLICT DO UPDATE command cannot affect row a second time` al guardar borrador.
- **Causa:** Las predicciones para el Partido del 3er Puesto (Partido 103) y la Gran Final (Partido 104) se están mapeando incorrectamente a las llaves `P1_SF_M102` y `P1_SF_M101` (duplicando las llaves de las semifinales).
- **Solución:** Reemplazar las llaves de Tercer Puesto por `P1_SF_M103` y de la Gran Final por `P1_SF_M104` tanto en las vistas de formulario como en las funciones de envío (`handleSubmitPart1` y `handleSaveDraftPart1`).

### R2. Predicciones Independientes por Grupo (Pool)
- En la pestaña de predicciones ("Polla"), permitir al usuario elegir cuál de sus grupos está "activo" mediante botones/pills con estilos claros (resaltar con color verde esmeralda el grupo seleccionado).
- Cargar y guardar las predicciones del usuario (tanto Parte 1 como Parte 2) de forma independiente por cada grupo.
- **Base de Datos:**
  - Agregar la columna `pool_id` a las tablas `full_tournament_predictions`, `phase_predictions`, y `champion_predictions` y actualizar sus claves primarias para que sean compuestas: `(user_id, pool_id, prediction_key)`, `(user_id, pool_id, match_id)`, y `(user_id, pool_id)` respectively.
  - Actualizar los helpers en `src/lib/db-helpers.ts` para que pasen y filtren por `pool_id` in todas las lecturas y escrituras.

### R3. Recálculo de Puntos por Grupo y Tabla `pool_members`
- Actualizar la función de base de datos `compute_points` (en `calculate_points.sql` y base de datos) para que compute los puntos de forma independiente para cada par `(user_id, pool_id)`.
- Guardar los puntos acumulados de la Parte 1 y 2 en las nuevas columnas `part1_points`, `part2_points`, y `total_points` de la tabla `pool_members`.
- El puntaje global en `profiles.total_points` debe ser el puntaje **máximo** que el usuario tenga entre cualquiera de sus grupos.

### R4. Leaderboards por Grupo (Pestaña "Posiciones")
- En la pestaña de Posiciones (`LeaderboardTab.tsx`), permitir al usuario alternar entre "Clasificación Global" y "Clasificación por Grupos".
- En la vista por grupos, mostrar un selector para elegir el grupo activo y desplegar la tabla de posiciones de los miembros de ese grupo, ordenados por los puntos obtenidos en ese grupo (`pool_members.total_points`).

### R5. Modo de Producción en Vivo (Quitar Tiempo Virtual)
- Eliminar el tiempo virtual del sistema. Todas las verificaciones de bloqueos y cuentas regresivas deben utilizar la hora real del cliente/servidor (`new Date()`).
- Ocultar/eliminar el componente `AdminControl` del dashboard para evitar simulaciones de fecha.

## Acceptance Criteria

### UI & UX
- [ ] La pestaña "Polla" tiene un selector de grupo activo destacado en color verde. Al cambiar de grupo, se recargan las predicciones específicas de ese grupo.
- [ ] No ocurre el error `ON CONFLICT` al guardar borrador.
- [ ] La pestaña "Posiciones" incluye un selector de grupo y muestra los rankings correspondientes ordenados según los puntos acumulados dentro del grupo seleccionado.
- [ ] No se muestra el panel flotante de administrador (engranaje) ni controles de fecha virtual.

### Funcionalidad y Reglas
- [ ] El guardado de predicciones es independiente (el usuario puede pronosticar que MEX gana en el Grupo A, y que MEX pierde en el Grupo B).
- [ ] Los puntos se calculan independientemente para cada grupo en la base de datos.
- [ ] Las verificaciones de bloqueo se realizan contra la hora real del sistema (`new Date()`).
- [ ] El proyecto compila limpiamente (`npm run build`).

## Follow-up — 2026-06-10T15:27:46-05:00

Quitar la palabra "Simulador" del portal, añadir funcionalidad para que los creadores de grupos puedan eliminarlos (solo el creador/administrador), y proporcionar un manual paso a paso de despliegue en Vercel.

Working directory: c:\Users\Edison\Desktop\LaPolla
Integrity mode: development

## Requirements

### R1. Eliminar Texto de Simulador en la Interfaz
- Quitar "(Simulador)" de la cabecera de la Parte 1 en `src/components/dashboard/FixtureTab.tsx` para que diga "La Gran Polla" en lugar de "La Gran Polla (Simulador)".

### R2. Eliminar Grupos (Creador/Administrador)
- En la pestaña de Grupos (`src/components/dashboard/GroupsTab.tsx`), si el usuario activo es el creador/administrador del grupo seleccionado (`selectedPool.created_by === userId`), mostrar un botón estético para "Borrar Grupo".
- Implementar la función `handleDeleteGroup` en `GroupsTab.tsx` para eliminar el registro de la tabla `pools` de Supabase.
- Asegurar que al eliminar el grupo, se limpien y actualicen los estados de grupos locales de forma fluida, redirigiendo al usuario al primer grupo restante o restableciendo el estado si no quedan más grupos.

### R3. Documentación de Despliegue en Vercel "para Dummies"
- Crear un archivo de documentación en markdown `docs/deploy_vercel.md` con instrucciones detalladas, paso a paso y fáciles de entender, para desplegar el portal en una cuenta secundaria de Vercel (incluyendo la vinculación con el repositorio de GitHub y la configuración de variables de entorno).

## Acceptance Criteria

### UI & UX
- [ ] La cabecera en la solapa "Polla" (Parte 1) muestra "🏆 La Gran Polla" sin la palabra "(Simulador)".
- [ ] Si el usuario no es el creador del grupo, no ve el botón de "Borrar Grupo".
- [ ] Si el usuario es el creador del grupo, ve el botón "Borrar Grupo" en color rojo en la tarjeta de detalles del grupo. Al hacer clic, se muestra una ventana de confirmación estándar.

### Funcionalidad y Seguridad
- [ ] Al hacer clic en "Borrar Grupo" y confirmar, el grupo se elimina de Supabase. Las tablas dependientes (`pool_members`, `full_tournament_predictions`, etc.) se limpian mediante la regla de eliminación en cascada (`on delete cascade`).
- [ ] La UI actualiza la lista de grupos activos y selecciona otro de forma automática.
- [ ] El manual paso a paso existe en `docs/deploy_vercel.md` y es claro para usuarios no técnicos.
- [ ] La aplicación compila de forma limpia sin warnings ni errores de compilación (`npm run build`).
