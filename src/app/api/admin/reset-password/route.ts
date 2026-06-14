import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = createClient();
  
  // Verify requesting user's authentication session
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Query user profile to verify admin role
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

  // Extract userId and newPassword from JSON request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Formato de solicitud no válido' }, { status: 400 });
  }

  const { userId, newPassword } = body;

  // Validate inputs
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'ID de usuario no válido' }, { status: 400 });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
  }

  try {
    // Initialize Supabase service role client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const adminClient = createAdminClient(supabaseUrl, supabaseServiceKey);

    // Update target user's password
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword });

    if (updateError) {
      console.error('Error al actualizar contraseña:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Contraseña restablecida exitosamente' }, { status: 200 });
  } catch (err: any) {
    console.error('Error en POST /api/admin/reset-password:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: err.message || 'Error interno del servidor.' 
      },
      { status: 500 }
    );
  }
}
