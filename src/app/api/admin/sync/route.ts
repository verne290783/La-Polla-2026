import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncRealScores } from '@/lib/scoreSync';

export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = createClient();
  
  // Obtener el usuario actual autenticado
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Obtener el perfil del usuario para validar si es administrador
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const isAdmin = profile.email === 'ehdiazs@gmail.com' || profile.is_admin === true;
  if (!isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const result = await syncRealScores();
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('Error en POST /api/admin/sync:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: err.message || 'Error interno del servidor durante la sincronización.' 
      },
      { status: 500 }
    );
  }
}
