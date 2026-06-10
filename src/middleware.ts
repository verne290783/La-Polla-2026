import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { user, response, supabase } = await updateSession(request);
  const path = request.nextUrl.pathname;

  // Excluir de forma explícita archivos estáticos, favicon, y rutas de cron
  const isStaticFile = path.includes('.') || path.startsWith('/_next') || path === '/favicon.ico';
  const isCronRoute = path.startsWith('/api/cron');

  if (isStaticFile || isCronRoute) {
    return response;
  }

  // Caso: Usuario NO autenticado
  if (!user) {
    // Si intenta acceder a cualquier ruta protegida, redirigir a la landing de login (/)
    if (path !== '/') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return response;
  }

  // Caso: Usuario Autenticado
  // Verificar si pertenece a al menos un grupo (pool)
  const { data: pools } = await supabase
    .from('pool_members')
    .select('pool_id')
    .eq('user_id', user.id)
    .limit(1);

  const hasGroup = pools && pools.length > 0;

  // Redirección si está en la raíz (/) pero ya está logueado
  if (path === '/') {
    if (hasGroup) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/welcome', request.url));
    }
  }

  // Regla fundamental: Si no tiene grupo, solo puede estar en la pantalla de bienvenida (/welcome)
  if (!hasGroup) {
    if (path !== '/welcome') {
      return NextResponse.redirect(new URL('/welcome', request.url));
    }
  } else {
    // Si ya tiene grupo, no tiene sentido que vuelva a la pantalla de bienvenida
    if (path === '/welcome') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplica la middleware a todas las rutas excepto:
     * - api/cron (rutas públicas del cron job)
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes de Next.js)
     * - favicon.ico (icono del sitio)
     */
    '/((?!api/cron|_next/static|_next/image|favicon.ico).*)',
  ],
};
