'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function WelcomePage() {
  const router = useRouter();
  const supabase = createClient();

  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Generar código alfanumérico único de 6 caracteres en mayúsculas
  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setErrorMsg('Por favor, ingresa un nombre para el grupo.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No estás autenticado.');

      const code = generateInviteCode();

      // 1. Crear el grupo en la tabla pools
      const { data: pool, error: poolError } = await supabase
        .from('pools')
        .insert({
          name: groupName.trim(),
          invite_code: code,
          created_by: user.id,
        })
        .select()
        .single();

      if (poolError) throw poolError;

      // 2. Unir al creador automáticamente al grupo en pool_members
      const { error: memberError } = await supabase
        .from('pool_members')
        .insert({
          pool_id: pool.id,
          user_id: user.id,
        });

      if (memberError) throw memberError;

      // Guardar el código generado para mostrárselo
      setCreatedCode(code);
      setCreatedName(pool.name);
      setSuccessMsg(`¡Grupo "${pool.name}" creado con éxito!`);
      setGroupName('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al crear el grupo. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inviteCode.trim();
    if (!cleanCode) {
      setErrorMsg('Por favor, ingresa el código de invitación.');
      return;
    }
    if (cleanCode.length !== 6) {
      setErrorMsg('El código de invitación debe tener exactamente 6 caracteres.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No estás autenticado.');

      const codeFormatted = inviteCode.trim().toUpperCase();

      // 1. Buscar si existe el grupo con ese código
      const { data: pool, error: fetchError } = await supabase
        .from('pools')
        .select('id, name')
        .eq('invite_code', codeFormatted)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!pool) {
        throw new Error('El código ingresado no existe o es incorrecto.');
      }

      // 2. Insertar al usuario como miembro del grupo
      const { error: joinError } = await supabase
        .from('pool_members')
        .insert({
          pool_id: pool.id,
          user_id: user.id,
        });

      if (joinError) {
        // Manejar caso de que ya pertenezca al grupo (violación de primary key)
        if (joinError.code === '23505') {
          throw new Error('Ya perteneces a este grupo.');
        }
        throw joinError;
      }

      setSuccessMsg(`¡Te has unido con éxito al grupo "${pool.name}"! Redirigiendo...`);
      
      // Redirigir al dashboard
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al unirse al grupo.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!createdCode) return;
    navigator.clipboard.writeText(createdCode);
    alert('¡Código de invitación copiado al portapapeles!');
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 py-12 overflow-hidden bg-radial-gradient">
      {/* Efectos de fondo */}
      <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-emerald-950/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-amber-950/20 blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl">
        {/* Cabecera */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            ¡Bienvenido a <span className="gold-gradient-text">La Polla</span>!
          </h1>
          <p className="text-neutral-400 max-w-md mx-auto text-sm">
            Para ver pronósticos, marcadores o ingresar al leaderboard, necesitas pertenecer a al menos un grupo de juego.
          </p>
        </div>

        {/* Notificaciones */}
        {errorMsg && (
          <div className="p-4 mb-6 text-sm text-red-200 bg-red-950/60 border border-red-500/20 rounded-xl text-center">
            ⚠️ {errorMsg}
          </div>
        )}
        {successMsg && !createdCode && (
          <div className="p-4 mb-6 text-sm text-emerald-200 bg-emerald-950/60 border border-emerald-500/20 rounded-xl text-center">
            🎉 {successMsg}
          </div>
        )}

        {/* Si se acaba de crear un grupo con éxito, mostrar pantalla especial con el código */}
        {createdCode ? (
          <div className="max-w-md mx-auto p-8 rounded-2xl glass-card border border-amber-500/20 text-center shadow-xl">
            <span className="text-5xl mb-4 block">🎉</span>
            <h2 className="text-2xl font-bold text-white mb-2">¡Grupo Creado!</h2>
            <p className="text-neutral-400 text-sm mb-6">
              Comparte este código de invitación con tus amigos para que se unan a **{createdName}**:
            </p>
            
            {/* Tarjeta de Código */}
            <div className="flex items-center justify-between gap-2 p-4 bg-neutral-900 border border-neutral-800 rounded-xl mb-6">
              <span className="text-3xl font-mono font-bold tracking-widest text-amber-400 select-all mx-auto">
                {createdCode}
              </span>
              <button
                onClick={copyToClipboard}
                type="button"
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition"
              >
                Copiar
              </button>
            </div>

            <button
              onClick={handleGoToDashboard}
              type="button"
              className="w-full py-4 font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg"
            >
              Entrar al Dashboard
            </button>
          </div>
        ) : (
          /* Opciones: Crear o Unirse */
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Opción 1: Crear Grupo */}
            <div className="p-8 rounded-2xl glass-card border border-emerald-500/10 flex flex-col justify-between shadow-lg">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center text-2xl mb-6">
                  ➕
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Crear un Grupo</h2>
                <p className="text-neutral-400 text-xs mb-6 leading-relaxed">
                  Crea tu propia liga de amigos. Tú serás el administrador, recibirás un código exclusivo para invitarlos y podrás ver el ranking interno.
                </p>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-4">
                <input
                  type="text"
                  placeholder="Nombre del grupo (ej. Los Polleros)"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  disabled={loading}
                  maxLength={30}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-emerald-500/50 transition"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Cargando...' : 'Crear Grupo'}
                </button>
              </form>
            </div>

            {/* Opción 2: Unirse a Grupo */}
            <div className="p-8 rounded-2xl glass-card border border-emerald-500/10 flex flex-col justify-between shadow-lg">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-950/50 border border-amber-500/20 flex items-center justify-center text-2xl mb-6">
                  🔑
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Unirse con Código</h2>
                <p className="text-neutral-400 text-xs mb-6 leading-relaxed">
                  ¿Te invitó un amigo? Ingresa el código de invitación de 6 letras/números que te compartieron para ingresar a su liga de forma inmediata.
                </p>
              </div>

              <form onSubmit={handleJoinGroup} className="space-y-4">
                <input
                  type="text"
                  placeholder="Código de 6 caracteres (ej. AB45DX)"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  disabled={loading}
                  maxLength={6}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500/50 transition font-mono uppercase tracking-widest text-center"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Cargando...' : 'Unirse al Grupo'}
                </button>
              </form>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
