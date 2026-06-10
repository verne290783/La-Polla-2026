'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Verificar si ya está logueado para redirigir
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // El middleware se encargará de redirigir a /dashboard o /welcome
        router.push('/dashboard');
        router.refresh();
      }
    }
    checkUser();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (isSignUp && !fullName.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        // REGISTRO
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim(),
            }
          }
        });

        if (error) throw error;

        // Comprobar si se requiere confirmación de correo
        if (data.user && data.session === null) {
          setMessage({
            text: '¡Registro exitoso! Te enviamos un correo de confirmación. Por favor, confírmalo antes de iniciar sesión. (O desactiva "Confirm email" en Supabase para entrar de inmediato).',
            type: 'success'
          });
        } else if (data.user && data.session) {
          setMessage({
            text: '¡Cuenta creada con éxito! Entrando...',
            type: 'success'
          });
          setTimeout(() => {
            router.push('/dashboard');
            router.refresh();
          }, 1500);
        }
      } else {
        // INICIO DE SESIÓN
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) throw error;

        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      setMessage({
        text: err.message || 'Error en la autenticación. Revisa tus datos.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 py-12 overflow-hidden bg-radial-gradient">
      {/* Luces y efectos de fondo */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-900/10 blur-[120px] pointer-events-none" />

      {/* Grid decorativo */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <main className="relative z-10 w-full max-w-md p-8 text-center rounded-2xl glass-card border border-emerald-500/10 shadow-2xl">
        {/* Logo de Copa del Mundo */}
        <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-950/60 border border-emerald-500/20 text-4xl shadow-inner animate-pulse">
          🏆
        </div>

        {/* Título Principal */}
        <h1 className="text-4xl font-black tracking-tight mb-1 uppercase">
          La <span className="gold-gradient-text">Polla</span>
        </h1>
        <p className="text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-6">
          Portal de Pronósticos Mundial 2026
        </p>

        {/* Notificación de error o éxito */}
        {message && (
          <div className={`p-4 mb-6 text-xs text-center border rounded-xl font-medium ${
            message.type === 'success' 
              ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300' 
              : 'bg-red-950/60 border-red-500/30 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs de control Iniciar Sesión / Registrarse */}
        <div className="flex p-1 rounded-xl bg-neutral-900/80 border border-neutral-800/80 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition duration-200 ${
              !isSignUp ? 'bg-emerald-600 text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition duration-200 ${
              isSignUp ? 'bg-emerald-600 text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleAuth} className="space-y-4 text-left">
          {isSignUp && (
            <div>
              <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Nombre Completo</label>
              <input
                type="text"
                placeholder="Ingresa tu nombre para el ranking"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={isSignUp}
                maxLength={40}
                className="w-full px-4 py-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-white placeholder-neutral-600 text-xs focus:outline-none focus:border-emerald-500/50 transition"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Correo Electrónico</label>
            <input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-white placeholder-neutral-600 text-xs focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>

          <div>
            <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-white placeholder-neutral-600 text-xs focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 text-xs font-black rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 transition duration-300 shadow-lg uppercase tracking-wider disabled:opacity-50 mt-6"
          >
            {loading ? 'Procesando...' : isSignUp ? 'Crear Cuenta' : 'Ingresar'}
          </button>
        </form>

        {/* Nota */}
        <p className="mt-6 text-[10px] text-neutral-500 leading-relaxed">
          Usa tu correo y contraseña para crear o ingresar a tu cuenta. Los datos se almacenan de forma segura en Supabase.
        </p>
      </main>

      <footer className="absolute bottom-6 text-xs text-neutral-600 font-medium tracking-wide">
        MUNDIAL FIFA 2026 — MÉXICO, CANADÁ Y USA
      </footer>
    </div>
  );
}
