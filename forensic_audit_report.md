# Reporte de Auditoría Forense - Plataforma La Polla Mundial 2026

## 1. Executive Summary

### Integridad de la Base de Datos
⚠️ **ALERTA**: Se han detectado discrepancias y envíos tardíos que comprometen la integridad del estado actual de la base de datos. Se requiere corregir los puntajes afectados.

- **Total de Usuarios Auditados**: 37
- **Total de Predicciones Tardías Encontradas**: 205
- **Discrepancia General de Puntos**: 0 predicciones con puntaje incorrecto en la base de datos.

## 2. User Breakdown

Análisis detallado para los usuarios clave seleccionados:

### Usuario: Edison Diaz (ehdiazs@gmail.com)
- **ID de Usuario**: `9d5ddc8c-9047-4320-8f07-02dab546588a`
- **Grupos Asociados y Puntajes**:
  - **Grupo**: Sabrosos van al mundial (`39b781ac-fe06-4d76-aa92-e34ead2f374b`)
    - *Puntaje DB*: P1: 56 | P2: 52 | Total: 108
    - *Puntaje Auditado*: P1: 56 | P2: 52 | Total: 108
    - ✅ Puntaje correcto en este grupo.
  - **Grupo**: Famila Diaz (`df208c4f-43c6-4f3e-84f1-03c287a3ac6a`)
    - *Puntaje DB*: P1: 55 | P2: 49 | Total: 104
    - *Puntaje Auditado*: P1: 55 | P2: 49 | Total: 104
    - ✅ Puntaje correcto en este grupo.
  - **Grupo**: Familia Martinez (`f2081e47-2bb7-4ef2-9a4b-2abb329b5369`)
    - *Puntaje DB*: P1: 63 | P2: 60 | Total: 123
    - *Puntaje Auditado*: P1: 63 | P2: 60 | Total: 123
    - ✅ Puntaje correcto en este grupo.
  - **Grupo**: PTV Peru (`5174768a-ab27-4243-ab79-b5d2e93b133e`)
    - *Puntaje DB*: P1: 47 | P2: 69 | Total: 116
    - *Puntaje Auditado*: P1: 47 | P2: 69 | Total: 116
    - ✅ Puntaje correcto en este grupo.
  - **Grupo**: Petreven (`93ea28c5-1852-45b1-b6a4-b5901fce1fdb`)
    - *Puntaje DB*: P1: 27 | P2: 36 | Total: 63
    - *Puntaje Auditado*: P1: 27 | P2: 36 | Total: 63
    - ✅ Puntaje correcto en este grupo.
- **Total de Predicciones Tardías**: 25
- **Detalle de Predicciones Tardías**:

| Tipo | Identificador | Hora Predicción (updated_at) | Hora Bloqueo (lock_time) | Puntos DB | Puntos Auditados |
| --- | --- | --- | --- | --- | --- |
| phase | Match #1 | `2026-06-11T19:30:10.471+00:00` | `2026-06-11T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_2 | `2026-06-18T17:30:27.066502+00:00` | `2026-06-12T01:00:00+00:00` | 0 | 0 |
| full_tournament | G_38 | `2026-06-18T17:35:27.934543+00:00` | `2026-06-16T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_49 | `2026-06-18T17:35:57.033361+00:00` | `2026-06-16T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_37 | `2026-06-18T17:35:27.934543+00:00` | `2026-06-15T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_32 | `2026-06-18T17:34:10.236573+00:00` | `2026-06-15T01:00:00+00:00` | 0 | 0 |
| full_tournament | G_50 | `2026-06-18T17:35:57.033361+00:00` | `2026-06-16T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_26 | `2026-06-18T17:34:10.236573+00:00` | `2026-06-14T22:00:00+00:00` | 0 | 0 |
| full_tournament | G_44 | `2026-06-18T17:35:27.934543+00:00` | `2026-06-15T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_11 | `2026-06-18T17:31:47.809556+00:00` | `2026-06-12T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_19 | `2026-06-18T17:32:17.026096+00:00` | `2026-06-13T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_12 | `2026-06-18T17:31:47.809556+00:00` | `2026-06-13T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_13 | `2026-06-18T17:31:47.809556+00:00` | `2026-06-13T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_14 | `2026-06-18T17:31:47.809556+00:00` | `2026-06-14T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_20 | `2026-06-18T17:32:17.026096+00:00` | `2026-06-14T03:00:00+00:00` | 0 | 0 |
| full_tournament | G_25 | `2026-06-18T17:34:10.236573+00:00` | `2026-06-14T16:00:00+00:00` | 0 | 0 |
| full_tournament | G_31 | `2026-06-18T17:34:10.236573+00:00` | `2026-06-14T19:00:00+00:00` | 0 | 0 |
| full_tournament | G_62 | `2026-06-18T17:44:09.552937+00:00` | `2026-06-18T01:00:00+00:00` | 0 | 0 |
| full_tournament | G_68 | `2026-06-18T17:44:09.552937+00:00` | `2026-06-17T22:00:00+00:00` | 0 | 0 |
| full_tournament | G_67 | `2026-06-18T17:44:09.552937+00:00` | `2026-06-17T19:00:00+00:00` | 0 | 0 |
| full_tournament | G_55 | `2026-06-18T17:39:45.731362+00:00` | `2026-06-17T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_4 | `2026-06-18T17:30:27.066502+00:00` | `2026-06-18T15:00:00+00:00` | 0 | 0 |
| full_tournament | G_1 | `2026-06-11T19:23:09.4269+00:00` | `2026-06-11T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_1 | `2026-06-18T17:30:27.066502+00:00` | `2026-06-11T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_56 | `2026-06-18T17:39:45.731362+00:00` | `2026-06-17T03:00:00+00:00` | 0 | 0 |

### Usuario: Guillermo León (galeonba@gmail.com)
- **ID de Usuario**: `ffdedc37-7f89-4e36-8bee-45db93e17a1a`
- **Grupos Asociados y Puntajes**:
  - **Grupo**: Sabrosos van al mundial (`39b781ac-fe06-4d76-aa92-e34ead2f374b`)
    - *Puntaje DB*: P1: 55 | P2: 56 | Total: 111
    - *Puntaje Auditado*: P1: 55 | P2: 56 | Total: 111
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
    - *Puntaje DB*: P1: 69 | P2: 50 | Total: 119
    - *Puntaje Auditado*: P1: 69 | P2: 50 | Total: 119
    - ✅ Puntaje correcto en este grupo.
- **Total de Predicciones Tardías**: 0
- *No se detectaron predicciones tardías para este usuario.*

### Usuario: Javier Franco (jafranconi@yahoo.es)
- **ID de Usuario**: `8a613d9f-e8e6-4311-915a-9a84ef2adbad`
- **Grupos Asociados y Puntajes**:
  - **Grupo**: Famila Diaz (`df208c4f-43c6-4f3e-84f1-03c287a3ac6a`)
    - *Puntaje DB*: P1: 54 | P2: 46 | Total: 100
    - *Puntaje Auditado*: P1: 54 | P2: 46 | Total: 100
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
    - *Puntaje DB*: P1: 34 | P2: 73 | Total: 107
    - *Puntaje Auditado*: P1: 34 | P2: 73 | Total: 107
    - ✅ Puntaje correcto en este grupo.
- **Total de Predicciones Tardías**: 19
- **Detalle de Predicciones Tardías**:

| Tipo | Identificador | Hora Predicción (updated_at) | Hora Bloqueo (lock_time) | Puntos DB | Puntos Auditados |
| --- | --- | --- | --- | --- | --- |
| full_tournament | G_38 | `2026-06-17T04:19:17.340768+00:00` | `2026-06-16T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_49 | `2026-06-17T04:23:10.693115+00:00` | `2026-06-16T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_37 | `2026-06-17T04:19:17.340768+00:00` | `2026-06-15T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_32 | `2026-06-17T04:18:14.778355+00:00` | `2026-06-15T01:00:00+00:00` | 0 | 0 |
| full_tournament | G_50 | `2026-06-17T04:23:10.693115+00:00` | `2026-06-16T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_2 | `2026-06-17T04:13:37.309059+00:00` | `2026-06-12T01:00:00+00:00` | 0 | 0 |
| full_tournament | G_26 | `2026-06-17T04:17:20.225093+00:00` | `2026-06-14T22:00:00+00:00` | 0 | 0 |
| full_tournament | G_44 | `2026-06-17T04:19:53.450673+00:00` | `2026-06-15T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_11 | `2026-06-17T04:14:42.906669+00:00` | `2026-06-12T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_19 | `2026-06-17T04:16:38.448668+00:00` | `2026-06-13T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_12 | `2026-06-17T04:14:42.906669+00:00` | `2026-06-13T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_13 | `2026-06-17T04:14:51.922384+00:00` | `2026-06-13T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_14 | `2026-06-17T04:15:49.061263+00:00` | `2026-06-14T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_20 | `2026-06-17T04:16:38.448668+00:00` | `2026-06-14T03:00:00+00:00` | 0 | 0 |
| full_tournament | G_25 | `2026-06-17T04:17:20.225093+00:00` | `2026-06-14T16:00:00+00:00` | 0 | 0 |
| full_tournament | G_31 | `2026-06-17T04:18:14.778355+00:00` | `2026-06-14T19:00:00+00:00` | 0 | 0 |
| full_tournament | G_55 | `2026-06-17T04:24:03.075075+00:00` | `2026-06-17T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_1 | `2026-06-17T04:12:53.139134+00:00` | `2026-06-11T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_56 | `2026-06-17T04:24:03.075075+00:00` | `2026-06-17T03:00:00+00:00` | 0 | 0 |

### Usuario: Aldair Lequernaque (aldair45117345@gmail.com)
- **ID de Usuario**: `78b33c76-a31a-4b36-80bb-cbfcae943a5e`
- **Grupos Asociados y Puntajes**:
  - **Grupo**: PTV Peru (`5174768a-ab27-4243-ab79-b5d2e93b133e`)
    - *Puntaje DB*: P1: 4 | P2: 0 | Total: 4
    - *Puntaje Auditado*: P1: 4 | P2: 0 | Total: 4
    - ✅ Puntaje correcto en este grupo.
- **Total de Predicciones Tardías**: 35
- **Detalle de Predicciones Tardías**:

| Tipo | Identificador | Hora Predicción (updated_at) | Hora Bloqueo (lock_time) | Puntos DB | Puntos Auditados |
| --- | --- | --- | --- | --- | --- |
| full_tournament | G_50 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-16T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_55 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-17T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_40 | `2026-06-22T00:37:02.858649+00:00` | `2026-06-22T00:00:00+00:00` | null | null |
| full_tournament | G_34 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-21T03:00:00+00:00` | 0 | 0 |
| full_tournament | G_44 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-15T21:00:00+00:00` | 0 | 0 |
| full_tournament | G_19 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-13T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_20 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-14T03:00:00+00:00` | 0 | 0 |
| full_tournament | G_38 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-16T00:00:00+00:00` | 0 | 0 |
| full_tournament | G_21 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-19T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_49 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-16T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_32 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-15T01:00:00+00:00` | 0 | 0 |
| full_tournament | G_37 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-15T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_62 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-18T01:00:00+00:00` | 0 | 0 |
| full_tournament | G_67 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-17T19:00:00+00:00` | 0 | 0 |
| full_tournament | G_68 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-17T22:00:00+00:00` | 0 | 0 |
| full_tournament | G_4 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-18T15:00:00+00:00` | 0 | 0 |
| full_tournament | G_10 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-18T18:00:00+00:00` | 0 | 0 |
| full_tournament | G_9 | `2026-06-21T11:23:05.42215+00:00` | `2026-06-18T21:00:00+00:00` | 0 | 0 |
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

### Grupo: IRJRSX (`086ecb50-0ec4-491f-bec4-597ac66445a6`)

#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:

| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |
| --- | --- | --- | --- | --- | --- |
| 1 | William manuel Martínez barrera | 0 (0/0/0) | 1 | 0 (0/0/0) | ✅ No |

### Grupo: Sabrosos van al mundial (`39b781ac-fe06-4d76-aa92-e34ead2f374b`)

#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:

| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |
| --- | --- | --- | --- | --- | --- |
| 1 | Camilo Moreno | 146 (77/69/146) | 1 | 146 (77/69/146) | ✅ No |
| 2 | Daniel Sanchez | 127 (57/70/127) | 2 | 127 (57/70/127) | ✅ No |
| 3 | Ricardo  Sydkroy | 119 (69/50/119) | 3 | 119 (69/50/119) | ✅ No |
| 4 | Renemo | 115 (57/58/115) | 4 | 115 (57/58/115) | ✅ No |
| 5 | Guillermo León | 111 (55/56/111) | 5 | 111 (55/56/111) | ✅ No |
| 6 | Edison Diaz | 108 (56/52/108) | 6 | 108 (56/52/108) | ✅ No |

### Grupo: PTV Peru (`5174768a-ab27-4243-ab79-b5d2e93b133e`)

#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:

| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |
| --- | --- | --- | --- | --- | --- |
| 1 | Edison Diaz | 116 (47/69/116) | 1 | 116 (47/69/116) | ✅ No |
| 2 | Claudia Romero | 87 (38/49/87) | 2 | 87 (38/49/87) | ✅ No |
| 3 | Fiorentino Calce | 86 (65/21/86) | 3 | 86 (65/21/86) | ✅ No |
| 4 | Oscar castañeda | 64 (1/63/64) | 4 | 64 (1/63/64) | ✅ No |
| 5 | Edher Avila Seminario | 20 (4/16/20) | 5 | 20 (4/16/20) | ✅ No |
| 6 | Miguel angel Sosa Aguirre | 9 (9/0/9) | 6 | 9 (9/0/9) | ✅ No |
| 7 | Luis Paredes | 6 (0/6/6) | 7 | 6 (0/6/6) | ✅ No |
| 8 | Aldair Lequernaque | 4 (4/0/4) | 8 | 4 (4/0/4) | ✅ No |
| 9 | José Miguel  trujillo Ortiz | 3 (3/0/3) | 9 | 3 (3/0/3) | ✅ No |
| 9 | Víctor Moreno | 3 (0/3/3) | 9 | 3 (0/3/3) | ✅ No |
| 11 | Addemar Ávila Semimario | 0 (0/0/0) | 11 | 0 (0/0/0) | ✅ No |

### Grupo: Petreven (`93ea28c5-1852-45b1-b6a4-b5901fce1fdb`)

#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:

| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |
| --- | --- | --- | --- | --- | --- |
| 1 | Edison Diaz | 63 (27/36/63) | 1 | 63 (27/36/63) | ✅ No |
| 2 | Enrico Fornasari | 37 (24/13/37) | 2 | 37 (24/13/37) | ✅ No |
| 3 | Nicola | 33 (3/30/33) | 3 | 33 (3/30/33) | ✅ No |
| 4 | VINICIUS FRANÇA NASCIMENTO | 19 (14/5/19) | 4 | 19 (14/5/19) | ✅ No |
| 5 | Vincenzo Marcone | 10 (10/0/10) | 5 | 10 (10/0/10) | ✅ No |
| 6 | Luigi zucconi | 7 (7/0/7) | 6 | 7 (7/0/7) | ✅ No |
| 7 | Fiorentino Calce | 1 (0/1/1) | 7 | 1 (0/1/1) | ✅ No |
| 8 | Gino | 0 (0/0/0) | 8 | 0 (0/0/0) | ✅ No |
| 8 | Luigi | 0 (0/0/0) | 8 | 0 (0/0/0) | ✅ No |

### Grupo: Famila Diaz (`df208c4f-43c6-4f3e-84f1-03c287a3ac6a`)

#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:

| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |
| --- | --- | --- | --- | --- | --- |
| 1 | Edison Diaz | 104 (55/49/104) | 1 | 104 (55/49/104) | ✅ No |
| 2 | Javier Franco | 100 (54/46/100) | 2 | 100 (54/46/100) | ✅ No |
| 3 | Edna Diaz | 3 (0/3/3) | 3 | 3 (0/3/3) | ✅ No |

### Grupo: WLF (`df31d1a3-22ed-4cb7-abc9-de48f86d7c3f`)

#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:

| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |
| --- | --- | --- | --- | --- | --- |
| 1 | Gino | 0 (0/0/0) | 1 | 0 (0/0/0) | ✅ No |

### Grupo: Familia Martinez (`f2081e47-2bb7-4ef2-9a4b-2abb329b5369`)

#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:

| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |
| --- | --- | --- | --- | --- | --- |
| 1 | Edison Diaz | 123 (63/60/123) | 1 | 123 (63/60/123) | ✅ No |
| 2 | Yiyi302 | 122 (61/61/122) | 2 | 122 (61/61/122) | ✅ No |
| 3 | Angela martinez | 107 (34/73/107) | 3 | 107 (34/73/107) | ✅ No |
| 3 | CRISTIAN CASTRO | 107 (50/57/107) | 3 | 107 (50/57/107) | ✅ No |
| 5 | Karen P Martinez O | 101 (58/43/101) | 5 | 101 (58/43/101) | ✅ No |
| 6 | mary yenny martínez | 40 (10/30/40) | 6 | 40 (10/30/40) | ✅ No |
| 7 | seberus | 17 (0/17/17) | 7 | 17 (0/17/17) | ✅ No |
| 8 | Maria Jose | 4 (4/0/4) | 8 | 4 (4/0/4) | ✅ No |
| 9 | Sophie felizzola | 3 (3/0/3) | 9 | 3 (3/0/3) | ✅ No |

### Grupo: LOS FRIENDS (`f63b8156-5319-4242-92d1-e554e40d05be`)

#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:

| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |
| --- | --- | --- | --- | --- | --- |
| 1 | Yiyi302 | 62 (57/5/62) | 1 | 62 (57/5/62) | ✅ No |
| 2 | William manuel Martínez barrera | 0 (0/0/0) | 2 | 0 (0/0/0) | ✅ No |

### Grupo: El bostero (`5c9a67ab-70ce-4438-a4df-25d739b04990`)

#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:

| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |
| --- | --- | --- | --- | --- | --- |
| 1 | Porfirio Roberto Oscar | 0 (0/0/0) | 1 | 0 (0/0/0) | ✅ No |

