# Reporte de Auditoría Forense - Plataforma La Polla Mundial 2026

## 1. Executive Summary

### Integridad de la Base de Datos
⚠️ **ALERTA**: Se han detectado discrepancias y envíos tardíos que comprometen la integridad del estado actual de la base de datos. Se requiere corregir los puntajes afectados.

- **Total de Usuarios Auditados**: 39
- **Total de Predicciones Tardías Encontradas**: 240
- **Discrepancia General de Puntos**: 0 predicciones con puntaje incorrecto en la base de datos.

## 2. User Breakdown

Análisis detallado para los usuarios clave seleccionados:

### Usuario: Edison Diaz (ehdiazs@gmail.com)
- **ID de Usuario**: `9d5ddc8c-9047-4320-8f07-02dab546588a`
- **Grupos Asociados y Puntajes**:
  - **Grupo**: PTV Peru (`5174768a-ab27-4243-ab79-b5d2e93b133e`)
    - *Puntaje DB*: P1: 103 | P2: 131 | Total: 234
    - *Puntaje Auditado*: P1: 103 | P2: 131 | Total: 234
    - ✅ Puntaje correcto en este grupo.
  - **Grupo**: Familia Martinez (`f2081e47-2bb7-4ef2-9a4b-2abb329b5369`)
    - *Puntaje DB*: P1: 132 | P2: 125 | Total: 257
    - *Puntaje Auditado*: P1: 132 | P2: 125 | Total: 257
    - ✅ Puntaje correcto en este grupo.
  - **Grupo**: Petreven (`93ea28c5-1852-45b1-b6a4-b5901fce1fdb`)
    - *Puntaje DB*: P1: 87 | P2: 91 | Total: 178
    - *Puntaje Auditado*: P1: 87 | P2: 91 | Total: 178
    - ✅ Puntaje correcto en este grupo.
  - **Grupo**: Famila Diaz (`df208c4f-43c6-4f3e-84f1-03c287a3ac6a`)
    - *Puntaje DB*: P1: 111 | P2: 108 | Total: 219
    - *Puntaje Auditado*: P1: 111 | P2: 108 | Total: 219
    - ✅ Puntaje correcto en este grupo.
  - **Grupo**: Sabrosos van al mundial (`39b781ac-fe06-4d76-aa92-e34ead2f374b`)
    - *Puntaje DB*: P1: 109 | P2: 118 | Total: 227
    - *Puntaje Auditado*: P1: 109 | P2: 118 | Total: 227
    - ✅ Puntaje correcto en este grupo.
- **Total de Predicciones Tardías**: 25
- **Detalle de Predicciones Tardías**:

| Tipo | Identificador | Hora Predicción (updated_at) | Hora Bloqueo (lock_time) | Puntos DB | Puntos Auditados |
| --- | --- | --- | --- | --- | --- |
| phase | Match #1 | `2026-06-11T19:30:10.471+00:00` | `2026-06-11T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_2 | `2026-06-18T17:30:27.066502+00:00` | `2026-06-12T01:00:00+00:00` | 0 | 0 |
| full_tournament | G_37 | `2026-06-18T17:35:27.934543+00:00` | `2026-06-15T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_4 | `2026-06-18T17:30:27.066502+00:00` | `2026-06-18T15:00:00+00:00` | 0 | 0 |
| full_tournament | G_12 | `2026-06-18T17:31:47.809556+00:00` | `2026-06-13T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_11 | `2026-06-18T17:31:47.809556+00:00` | `2026-06-12T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_13 | `2026-06-18T17:31:47.809556+00:00` | `2026-06-13T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_14 | `2026-06-18T17:31:47.809556+00:00` | `2026-06-14T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_19 | `2026-06-18T17:32:17.026096+00:00` | `2026-06-13T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_20 | `2026-06-18T17:32:17.026096+00:00` | `2026-06-14T03:00:00+00:00` | 0 | 0 |
| full_tournament | G_25 | `2026-06-18T17:34:10.236573+00:00` | `2026-06-14T16:00:00+00:00` | 0 | 0 |
| full_tournament | G_26 | `2026-06-18T17:34:10.236573+00:00` | `2026-06-14T22:00:00+00:00` | 0 | 0 |
| full_tournament | G_31 | `2026-06-18T17:34:10.236573+00:00` | `2026-06-14T19:00:00+00:00` | 0 | 0 |
| full_tournament | G_32 | `2026-06-18T17:34:10.236573+00:00` | `2026-06-15T01:00:00+00:00` | 0 | 0 |
| full_tournament | G_38 | `2026-06-18T17:35:27.934543+00:00` | `2026-06-16T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_44 | `2026-06-18T17:35:27.934543+00:00` | `2026-06-15T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_49 | `2026-06-18T17:35:57.033361+00:00` | `2026-06-16T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_50 | `2026-06-18T17:35:57.033361+00:00` | `2026-06-16T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_55 | `2026-06-18T17:39:45.731362+00:00` | `2026-06-17T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_62 | `2026-06-18T17:44:09.552937+00:00` | `2026-06-18T01:00:00+00:00` | 0 | 0 |
| full_tournament | G_67 | `2026-06-18T17:44:09.552937+00:00` | `2026-06-17T19:00:00+00:00` | 0 | 0 |
| full_tournament | G_68 | `2026-06-18T17:44:09.552937+00:00` | `2026-06-17T22:00:00+00:00` | 0 | 0 |
| full_tournament | G_1 | `2026-06-11T19:23:09.4269+00:00` | `2026-06-11T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_1 | `2026-06-18T17:30:27.066502+00:00` | `2026-06-11T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_56 | `2026-06-18T17:39:45.731362+00:00` | `2026-06-17T03:00:00+00:00` | 0 | 0 |

### Usuario: Guillermo León (galeonba@gmail.com)
- **ID de Usuario**: `ffdedc37-7f89-4e36-8bee-45db93e17a1a`
- **Grupos Asociados y Puntajes**:
  - **Grupo**: Sabrosos van al mundial (`39b781ac-fe06-4d76-aa92-e34ead2f374b`)
    - *Puntaje DB*: P1: 137 | P2: 124 | Total: 261
    - *Puntaje Auditado*: P1: 137 | P2: 124 | Total: 261
    - ✅ Puntaje correcto en este grupo.
- **Total de Predicciones Tardías**: 2
- **Detalle de Predicciones Tardías**:

| Tipo | Identificador | Hora Predicción (updated_at) | Hora Bloqueo (lock_time) | Puntos DB | Puntos Auditados |
| --- | --- | --- | --- | --- | --- |
| phase | Match #1 | `2026-06-11T19:51:09.202+00:00` | `2026-06-11T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_1 | `2026-06-11T18:47:56.600581+00:00` | `2026-06-11T18:00:00+00:00` | 0 | 0 |

### Usuario: Ricardo  Sydkroy (vitto.ricardo@gmail.com)
- **ID de Usuario**: `2a1f732f-fc90-4e93-830a-0cd8fcbf0c9f`
- **Grupos Asociados y Puntajes**:
  - **Grupo**: Sabrosos van al mundial (`39b781ac-fe06-4d76-aa92-e34ead2f374b`)
    - *Puntaje DB*: P1: 145 | P2: 127 | Total: 272
    - *Puntaje Auditado*: P1: 145 | P2: 127 | Total: 272
    - ✅ Puntaje correcto en este grupo.
- **Total de Predicciones Tardías**: 0
- *No se detectaron predicciones tardías para este usuario.*

### Usuario: Javier Franco (jafranconi@yahoo.es)
- **ID de Usuario**: `8a613d9f-e8e6-4311-915a-9a84ef2adbad`
- **Grupos Asociados y Puntajes**:
  - **Grupo**: Famila Diaz (`df208c4f-43c6-4f3e-84f1-03c287a3ac6a`)
    - *Puntaje DB*: P1: 118 | P2: 122 | Total: 240
    - *Puntaje Auditado*: P1: 118 | P2: 122 | Total: 240
    - ✅ Puntaje correcto en este grupo.
- **Total de Predicciones Tardías**: 1
- **Detalle de Predicciones Tardías**:

| Tipo | Identificador | Hora Predicción (updated_at) | Hora Bloqueo (lock_time) | Puntos DB | Puntos Auditados |
| --- | --- | --- | --- | --- | --- |
| champion | Champion | `2026-06-13T23:50:52.94872+00:00` | `2026-06-11T20:00:00Z` | null | null |

### Usuario: Angela martinez (anglamartinez03@gmail.com)
- **ID de Usuario**: `976103f2-334d-4800-a7ce-255c5cfd9106`
- **Grupos Asociados y Puntajes**:
  - **Grupo**: Familia Martinez (`f2081e47-2bb7-4ef2-9a4b-2abb329b5369`)
    - *Puntaje DB*: P1: 92 | P2: 146 | Total: 238
    - *Puntaje Auditado*: P1: 92 | P2: 146 | Total: 238
    - ✅ Puntaje correcto en este grupo.
- **Total de Predicciones Tardías**: 19
- **Detalle de Predicciones Tardías**:

| Tipo | Identificador | Hora Predicción (updated_at) | Hora Bloqueo (lock_time) | Puntos DB | Puntos Auditados |
| --- | --- | --- | --- | --- | --- |
| full_tournament | G_37 | `2026-06-17T04:19:17.340768+00:00` | `2026-06-15T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_2 | `2026-06-17T04:13:37.309059+00:00` | `2026-06-12T01:00:00+00:00` | 0 | 0 |
| full_tournament | G_12 | `2026-06-17T04:14:42.906669+00:00` | `2026-06-13T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_11 | `2026-06-17T04:14:42.906669+00:00` | `2026-06-12T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_13 | `2026-06-17T04:14:51.922384+00:00` | `2026-06-13T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_14 | `2026-06-17T04:15:49.061263+00:00` | `2026-06-14T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_19 | `2026-06-17T04:16:38.448668+00:00` | `2026-06-13T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_20 | `2026-06-17T04:16:38.448668+00:00` | `2026-06-14T03:00:00+00:00` | 0 | 0 |
| full_tournament | G_25 | `2026-06-17T04:17:20.225093+00:00` | `2026-06-14T16:00:00+00:00` | 0 | 0 |
| full_tournament | G_26 | `2026-06-17T04:17:20.225093+00:00` | `2026-06-14T22:00:00+00:00` | 0 | 0 |
| full_tournament | G_31 | `2026-06-17T04:18:14.778355+00:00` | `2026-06-14T19:00:00+00:00` | 0 | 0 |
| full_tournament | G_32 | `2026-06-17T04:18:14.778355+00:00` | `2026-06-15T01:00:00+00:00` | 0 | 0 |
| full_tournament | G_38 | `2026-06-17T04:19:17.340768+00:00` | `2026-06-16T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_44 | `2026-06-17T04:19:53.450673+00:00` | `2026-06-15T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_49 | `2026-06-17T04:23:10.693115+00:00` | `2026-06-16T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_50 | `2026-06-17T04:23:10.693115+00:00` | `2026-06-16T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_55 | `2026-06-17T04:24:03.075075+00:00` | `2026-06-17T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_1 | `2026-06-17T04:12:53.139134+00:00` | `2026-06-11T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_56 | `2026-06-17T04:24:03.075075+00:00` | `2026-06-17T03:00:00+00:00` | 0 | 0 |

### Usuario: Aldair Lequernaque (aldair45117345@gmail.com)
- **ID de Usuario**: `78b33c76-a31a-4b36-80bb-cbfcae943a5e`
- **Grupos Asociados y Puntajes**:
  - **Grupo**: PTV Peru (`5174768a-ab27-4243-ab79-b5d2e93b133e`)
    - *Puntaje DB*: P1: 72 | P2: 37 | Total: 109
    - *Puntaje Auditado*: P1: 72 | P2: 37 | Total: 109
    - ✅ Puntaje correcto en este grupo.
- **Total de Predicciones Tardías**: 35
- **Detalle de Predicciones Tardías**:

| Tipo | Identificador | Hora Predicción (updated_at) | Hora Bloqueo (lock_time) | Puntos DB | Puntos Auditados |
| --- | --- | --- | --- | --- | --- |
| full_tournament | G_34 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-21T03:00:00+00:00` | 0 | 0 |
| full_tournament | G_40 | `2026-06-22T00:37:02.858649+00:00` | `2026-06-22T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_44 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-15T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_49 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-16T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_19 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-13T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_20 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-14T03:00:00+00:00` | 0 | 0 |
| full_tournament | G_38 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-16T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_21 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-19T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_32 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-15T01:00:00+00:00` | 0 | 0 |
| full_tournament | G_37 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-15T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_50 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-16T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_55 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-17T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_4 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-18T15:00:00+00:00` | 0 | 0 |
| full_tournament | G_10 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-18T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_9 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-18T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_62 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-18T01:00:00+00:00` | 0 | 0 |
| full_tournament | G_67 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-17T19:00:00+00:00` | 0 | 0 |
| full_tournament | G_68 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-17T22:00:00+00:00` | 0 | 0 |
| full_tournament | G_2 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-12T01:00:00+00:00` | 0 | 0 |
| full_tournament | G_3 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-19T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_11 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-12T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_12 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-13T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_13 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-13T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_14 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-14T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_15 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-19T23:30:00+00:00` | 0 | 0 |
| full_tournament | G_16 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-19T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_22 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-20T02:00:00+00:00` | 0 | 0 |
| full_tournament | G_25 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-14T16:00:00+00:00` | 0 | 0 |
| full_tournament | G_26 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-14T22:00:00+00:00` | 0 | 0 |
| full_tournament | G_27 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-20T19:00:00+00:00` | 0 | 0 |
| full_tournament | G_31 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-14T19:00:00+00:00` | 0 | 0 |
| full_tournament | G_33 | `2026-06-22T00:34:58.629256+00:00` | `2026-06-20T16:00:00+00:00` | 0 | 0 |
| full_tournament | G_61 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-17T16:00:00+00:00` | 0 | 0 |
| full_tournament | G_1 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-11T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_56 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-17T03:00:00+00:00` | 0 | 0 |

## 3. Group Breakdown

Comparación de posiciones calculadas por la auditoría frente a lo almacenado en `pool_members` para cada grupo:

### Grupo: LOS FRIENDS (`f63b8156-5319-4242-92d1-e554e40d05be`)

#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:

| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |
| --- | --- | --- | --- | --- | --- |
| 1 | Yiyi302 | 110 (105/5/110) | 1 | 110 (105/5/110) | ✅ No |
| 2 | William manuel Martínez barrera | 0 (0/0/0) | 2 | 0 (0/0/0) | ✅ No |

### Grupo: WLF (`df31d1a3-22ed-4cb7-abc9-de48f86d7c3f`)

#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:

| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |
| --- | --- | --- | --- | --- | --- |
| 1 | Gino | 0 (0/0/0) | 1 | 0 (0/0/0) | ✅ No |

### Grupo: Familia Martinez (`f2081e47-2bb7-4ef2-9a4b-2abb329b5369`)

#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:

| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |
| --- | --- | --- | --- | --- | --- |
| 1 | Edison Diaz | 257 (132/125/257) | 1 | 257 (132/125/257) | ✅ No |
| 2 | Angela martinez | 238 (92/146/238) | 2 | 238 (92/146/238) | ✅ No |
| 3 | CRISTIAN CASTRO | 228 (113/115/228) | 3 | 228 (113/115/228) | ✅ No |
| 4 | Yiyi302 | 221 (109/112/221) | 4 | 221 (109/112/221) | ✅ No |
| 5 | Karen P Martinez O | 181 (114/67/181) | 5 | 181 (114/67/181) | ✅ No |
| 6 | mary yenny martínez | 96 (16/80/96) | 6 | 96 (16/80/96) | ✅ No |
| 7 | seberus | 24 (6/18/24) | 7 | 24 (6/18/24) | ✅ No |
| 8 | Sophie felizzola | 5 (5/0/5) | 8 | 5 (5/0/5) | ✅ No |
| 9 | Maria Jose | 4 (4/0/4) | 9 | 4 (4/0/4) | ✅ No |

### Grupo: Famila Diaz (`df208c4f-43c6-4f3e-84f1-03c287a3ac6a`)

#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:

| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |
| --- | --- | --- | --- | --- | --- |
| 1 | Javier Franco | 240 (118/122/240) | 1 | 240 (118/122/240) | ✅ No |
| 2 | Edison Diaz | 219 (111/108/219) | 2 | 219 (111/108/219) | ✅ No |
| 3 | Edna Diaz | 3 (0/3/3) | 3 | 3 (0/3/3) | ✅ No |

### Grupo: Petreven (`93ea28c5-1852-45b1-b6a4-b5901fce1fdb`)

#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:

| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |
| --- | --- | --- | --- | --- | --- |
| 1 | Edison Diaz | 178 (87/91/178) | 1 | 178 (87/91/178) | ✅ No |
| 2 | Enrico Fornasari | 155 (89/66/155) | 2 | 155 (89/66/155) | ✅ No |
| 3 | Fiorentino Calce | 114 (40/74/114) | 3 | 114 (40/74/114) | ✅ No |
| 4 | Nicola | 98 (7/91/98) | 4 | 98 (7/91/98) | ✅ No |
| 5 | VINICIUS FRANÇA NASCIMENTO | 71 (66/5/71) | 5 | 71 (66/5/71) | ✅ No |
| 6 | Luigi zucconi | 45 (16/29/45) | 6 | 45 (16/29/45) | ✅ No |
| 7 | Vincenzo Marcone | 35 (35/0/35) | 7 | 35 (35/0/35) | ✅ No |
| 8 | Luigi | 1 (1/0/1) | 8 | 1 (1/0/1) | ✅ No |
| 9 | Gino | 0 (0/0/0) | 9 | 0 (0/0/0) | ✅ No |

### Grupo: PTV Peru (`5174768a-ab27-4243-ab79-b5d2e93b133e`)

#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:

| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |
| --- | --- | --- | --- | --- | --- |
| 1 | Edison Diaz | 234 (103/131/234) | 1 | 234 (103/131/234) | ✅ No |
| 2 | Claudia Romero | 207 (108/99/207) | 2 | 207 (108/99/207) | ✅ No |
| 3 | Fiorentino Calce | 189 (110/79/189) | 3 | 189 (110/79/189) | ✅ No |
| 4 | Aldair Lequernaque | 109 (72/37/109) | 4 | 109 (72/37/109) | ✅ No |
| 5 | Edher Avila Seminario | 97 (57/40/97) | 5 | 97 (57/40/97) | ✅ No |
| 6 | Oscar castañeda | 81 (18/63/81) | 6 | 81 (18/63/81) | ✅ No |
| 7 | Miguel angel Sosa Aguirre | 44 (9/35/44) | 7 | 44 (9/35/44) | ✅ No |
| 8 | Randy  cruz infante | 16 (0/16/16) | 8 | 16 (0/16/16) | ✅ No |
| 9 | Addemar Ávila Semimario | 9 (0/9/9) | 9 | 9 (0/9/9) | ✅ No |
| 10 | José Miguel  trujillo Ortiz | 6 (6/0/6) | 10 | 6 (6/0/6) | ✅ No |
| 10 | Luis Paredes | 6 (0/6/6) | 10 | 6 (0/6/6) | ✅ No |
| 12 | Víctor Moreno | 3 (0/3/3) | 12 | 3 (0/3/3) | ✅ No |
| 13 | FELIX CÓRDOVA RIVAS | 0 (0/0/0) | 13 | 0 (0/0/0) | ✅ No |

### Grupo: El bostero (`5c9a67ab-70ce-4438-a4df-25d739b04990`)

#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:

| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |
| --- | --- | --- | --- | --- | --- |
| 1 | Porfirio Roberto Oscar | 0 (0/0/0) | 1 | 0 (0/0/0) | ✅ No |

### Grupo: Sabrosos van al mundial (`39b781ac-fe06-4d76-aa92-e34ead2f374b`)

#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:

| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |
| --- | --- | --- | --- | --- | --- |
| 1 | Camilo Moreno | 277 (139/138/277) | 1 | 277 (139/138/277) | ✅ No |
| 2 | Ricardo  Sydkroy | 272 (145/127/272) | 2 | 272 (145/127/272) | ✅ No |
| 3 | Daniel Sanchez | 262 (125/137/262) | 3 | 262 (125/137/262) | ✅ No |
| 4 | Guillermo León | 261 (137/124/261) | 4 | 261 (137/124/261) | ✅ No |
| 5 | Edison Diaz | 227 (109/118/227) | 5 | 227 (109/118/227) | ✅ No |
| 6 | Renemo | 219 (105/114/219) | 6 | 219 (105/114/219) | ✅ No |

### Grupo: IRJRSX (`086ecb50-0ec4-491f-bec4-597ac66445a6`)

#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:

| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |
| --- | --- | --- | --- | --- | --- |
| 1 | William manuel Martínez barrera | 0 (0/0/0) | 1 | 0 (0/0/0) | ✅ No |

