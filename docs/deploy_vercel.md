# Guía de Despliegue en Vercel

Esta guía detalla los pasos para desplegar la aplicación "La Polla" en Vercel, conectándola con la base de datos de Supabase.

## Requisitos Previos

Antes de comenzar, asegúrate de tener:
1. Una cuenta de [Vercel](https://vercel.com).
2. Un proyecto en [Supabase](https://supabase.com) con la base de datos inicializada utilizando el archivo `supabase_schema.sql`.
3. El código fuente de la aplicación subido a un repositorio de [GitHub](https://github.com), GitLab o Bitbucket.

---

## Paso 1: Importar el Proyecto en Vercel

1. Inicia sesión en tu panel de control de Vercel.
2. Haz clic en el botón **"Add New..."** y selecciona **"Project"**.
3. Conecta tu cuenta de GitHub (si aún no lo has hecho) y busca el repositorio del proyecto.
4. Haz clic en **"Import"** junto al repositorio correspondiente.

---

## Paso 2: Configurar los Ajustes del Proyecto

En la pantalla de configuración de Vercel:
1. **Framework Preset**: Vercel detectará automáticamente **Next.js**. Déjalo tal como está.
2. **Root Directory**: Si el código está en la raíz de tu repositorio, déjalo en `./`.
3. **Build and Output Settings**: No es necesario modificar estos comandos a menos que tengas una configuración personalizada.

---

## Paso 3: Configurar Variables de Entorno

Expande la sección **"Environment Variables"** y añade las siguientes variables necesarias para el correcto funcionamiento del portal:

| Nombre de la Variable | Descripción / Valor |
|-----------------------|---------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto de Supabase (se encuentra en Settings > API). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública de tu proyecto de Supabase (Settings > API). |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de rol de servicio (Settings > API). *Nota: Mantén esta clave segura; solo se lee en el servidor.* |
| `FOOTBALL_API_KEY` | Clave de API externa para la sincronización de puntajes de fútbol. |
| `CRON_SECRET` | Token secreto utilizado para asegurar la ruta de sincronización de cron en `/api/cron/sync-scores`. |

---

## Paso 4: Desplegar

1. Una vez ingresadas todas las variables de entorno, haz clic en el botón **"Deploy"**.
2. Vercel iniciará el proceso de compilación y optimización de Next.js.
3. Este proceso suele tardar de 1 a 3 minutos. Cuando finalice, verás una pantalla de felicitación con la vista previa del sitio web.

---

## Paso 5: Configurar URL de Redirección en Supabase (Opcional)

Si utilizas autenticación por correo electrónico o proveedores externos (como Google/GitHub) en tu Supabase:
1. Ve a tu panel de Supabase.
2. Ve a **Authentication** > **URL Configuration**.
3. Añade la URL de producción proporcionada por Vercel (por ejemplo, `https://mi-polla-app.vercel.app`) a los **Redirect URLs** permitidos.

---

## Paso 6: Configurar Tareas Cron en Vercel (Opcional)

Si deseas habilitar la sincronización automática de partidos:
1. Asegúrate de configurar la variable `CRON_SECRET` en Vercel.
2. La ruta `/api/cron/sync-scores` está configurada para recibir peticiones automáticas. Puedes usar la funcionalidad nativa de **Vercel Cron** definiendo un archivo `vercel.json` en la raíz de tu proyecto o un servicio externo de cron web para llamar a esta URL de forma periódica con la cabecera `Authorization: Bearer <CRON_SECRET>`.
