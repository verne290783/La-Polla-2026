'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getProfile } from '@/lib/db-helpers';

// Tabs Components
import HomeTab from '@/components/dashboard/HomeTab';
import FixtureTab from '@/components/dashboard/FixtureTab';
import GroupsTab from '@/components/dashboard/GroupsTab';
import LeaderboardTab from '@/components/dashboard/LeaderboardTab';
import ProfileTab from '@/components/dashboard/ProfileTab';
import AdminControl from '@/components/dashboard/AdminControl';
import RulesTab from '@/components/dashboard/RulesTab';

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Reloj en vivo (Hora de Bogotá UTC-5)
  const [mounted, setMounted] = useState(false);
  const [bogotaTime, setBogotaTime] = useState('');

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'America/Bogota',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      const formatter = new Intl.DateTimeFormat('es-ES', options);
      // Formatear la fecha eliminando puntos de abreviaciones si es necesario
      setBogotaTime(formatter.format(new Date()).replace(/\./g, ''));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function initDashboard() {
      try {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.push('/');
          return;
        }

        setUser(authUser);
        
        // Cargar Perfil
        const prof = await getProfile(authUser.id);
        setProfile(prof);

        // Pestaña inicial para administradores
        if (prof?.email === 'ehdiazs@gmail.com' || prof?.is_admin === true) {
          setActiveTab('admin');
        }

      } catch (err) {
        console.error('Error inicializando el Dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    initDashboard();
  }, [router]);

  // Background Match Synchronization Polling
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    async function checkAndSync() {
      try {
        console.log('[Background Sync] Fetching sync endpoint...');
        const res = await fetch('/api/matches/sync');
        if (!res.ok) {
          console.error(`[Background Sync] Sync endpoint failed with status ${res.status}`);
          return;
        }
        const data = await res.json();
        console.log('[Background Sync] Response:', data);
        
        const count = data.activeMatchesCount ?? 0;
        if (count > 0) {
          if (!intervalId) {
            console.log(`[Background Sync] Active matches detected: ${count}. Starting 2-minute polling interval.`);
            intervalId = setInterval(checkAndSync, 120000); // 2 minutes
          }
        } else {
          if (intervalId) {
            console.log('[Background Sync] No active matches. Stopping polling interval.');
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      } catch (error) {
        console.error('[Background Sync] Error during background fetch:', error);
      }
    }

    checkAndSync();

    return () => {
      if (intervalId) {
        console.log('[Background Sync] Component unmounted. Clearing polling interval.');
        clearInterval(intervalId);
      }
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-emerald-400 font-bold text-sm tracking-widest uppercase">Cargando Portal...</p>
      </div>
    );
  }

  // Iconos SVG para los tabs
  const tabIcons: Record<string, React.ReactNode> = {
    home: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    fixture: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    grupos: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    leaderboard: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    perfil: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    rules: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    admin: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  };

  const tabs = [
    { id: 'home', label: 'Inicio' },
    { id: 'fixture', label: 'Polla' },
    { id: 'grupos', label: 'Grupos' },
    { id: 'leaderboard', label: 'Posiciones' },
    { id: 'rules', label: 'Reglas' },
    { id: 'perfil', label: 'Perfil' },
  ];

  if (profile?.email === 'ehdiazs@gmail.com' || profile?.is_admin === true) {
    tabs.push({ id: 'admin', label: 'Admin' });
  }

  return (
    <div className="min-h-screen bg-neutral-950 pb-24 md:pb-8 flex flex-col">
      {/* 1. Header (Desktop & Mobile) */}
      <header className="sticky top-0 z-30 w-full border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight uppercase">
              La <span className="gold-gradient-text">Polla</span>
            </h1>
            <span className="text-[10px] text-neutral-400 font-semibold lowercase tracking-wider mt-0.5 leading-none">
              sabrosa
            </span>
          </div>
        </div>

        {/* Reloj en vivo (Bogotá Time) */}
        {mounted && bogotaTime && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[10px] sm:text-xs font-semibold text-neutral-300 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline text-neutral-500 uppercase tracking-wider text-[9px] font-bold">Reloj Bogotá:</span>
            <span className="font-mono text-emerald-400">{bogotaTime}</span>
          </div>
        )}

        {/* Info de Perfil & Logout */}
        <div className="flex items-center gap-4">
          {profile && (
            <div className="hidden md:flex flex-col items-end text-xs">
              <span className="font-bold text-white">{profile.display_name}</span>
              <span className="text-emerald-400 font-semibold">{profile.total_points} pts</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition"
          >
            Salir
          </button>
        </div>
      </header>

      {/* 2. Layout Principal */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8 flex gap-8">
        
        {/* Barra Lateral Nav (Desktop only) */}
        <aside className="hidden md:block w-64 shrink-0 space-y-2">
          <div className="p-4 rounded-2xl bg-neutral-900/40 border border-neutral-800 mb-6 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-950 border border-emerald-500/30 flex items-center justify-center font-bold text-lg text-emerald-400 mx-auto mb-3 overflow-hidden shadow-inner">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
              ) : (
                profile?.display_name?.charAt(0).toUpperCase() || 'P'
              )}
            </div>
            <h3 className="font-bold text-white truncate text-sm">{profile?.display_name}</h3>
            <p className="text-xs text-neutral-400 truncate mb-2">{profile?.email}</p>
            <p className="text-xl font-black text-amber-500">{profile?.total_points || 0} <span className="text-xs text-neutral-500 font-bold uppercase">pts</span></p>
          </div>

          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition duration-200 ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900/50'
                }`}
              >
                {tabIcons[tab.id]}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Contenido Principal */}
        <main className="flex-1 min-w-0">
          {activeTab === 'home' && (
            <HomeTab userId={user.id} onNavigateToTab={(tab) => setActiveTab(tab)} />
          )}
          {activeTab === 'fixture' && (
            <FixtureTab userId={user.id} />
          )}
          {activeTab === 'grupos' && (
            <GroupsTab userId={user.id} />
          )}
          {activeTab === 'leaderboard' && (
            <LeaderboardTab currentUserId={user.id} />
          )}
          {activeTab === 'rules' && (
            <RulesTab />
          )}
          {activeTab === 'perfil' && (
            <ProfileTab userId={user.id} />
          )}
          {activeTab === 'admin' && (
            <AdminControl />
          )}
        </main>
      </div>

      {/* Nav de Botones Inferior (Mobile only!) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-neutral-950/95 border-t border-neutral-900 backdrop-blur-md px-2 py-2 flex items-center justify-start overflow-x-auto no-scrollbar gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1.5 py-1 px-3.5 rounded-xl transition shrink-0 ${
              activeTab === tab.id
                ? 'text-emerald-400 font-bold'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition ${activeTab === tab.id ? 'bg-emerald-950/80 border border-emerald-500/20' : ''}`}>
              {tabIcons[tab.id]}
            </div>
            <span className="text-[9px] uppercase tracking-wider font-semibold">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
