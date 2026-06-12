'use client';

import { useState, useEffect } from 'react';

interface AccordionSection {
  id: string;
  title: string;
  icon: string;
  color: 'gold' | 'emerald';
  content: React.ReactNode;
}

export default function RulesTab() {
  const [openSection, setOpenSection] = useState<string>('grupos');
  
  // Estado para el simulador de puntos interactivo
  const [simPhase, setSimPhase] = useState<'group' | 'knockout'>('group');
  const [realHome, setRealHome] = useState<number>(2);
  const [realAway, setRealAway] = useState<number>(1);
  const [predHome, setPredHome] = useState<number>(2);
  const [predAway, setPredAway] = useState<number>(1);
  const [realWinner, setRealWinner] = useState<'home' | 'away'>('home');
  const [predWinner, setPredWinner] = useState<'home' | 'away'>('home');

  // Sync realWinner when real score changes (automatic selection if not a draw)
  useEffect(() => {
    if (realHome > realAway) {
      setRealWinner('home');
    } else if (realAway > realHome) {
      setRealWinner('away');
    }
  }, [realHome, realAway]);

  // Sync predWinner when predicted score changes (automatic selection if not a draw)
  useEffect(() => {
    if (predHome > predAway) {
      setPredWinner('home');
    } else if (predAway > predHome) {
      setPredWinner('away');
    }
  }, [predHome, predAway]);

  // Cálculo de puntos simulado
  const calculateSimulatedPoints = () => {
    let pts = 0;
    const breakdown: string[] = [];

    const isDraw = realHome === realAway;
    const isPredDraw = predHome === predAway;

    if (simPhase === 'group') {
      // Fase de Grupos
      if (isDraw) {
        if (isPredDraw) {
          pts += 1;
          breakdown.push('+1 pt por acertar Empate');
          if (predHome === realHome) {
            pts += 1;
            breakdown.push('+1 pt por goles del Local');
          }
          if (predAway === realAway) {
            pts += 1;
            breakdown.push('+1 pt por goles del Visitante');
          }
        } else {
          breakdown.push('0 pts: Se requiere haber pronosticado un empate (Regla del Pronóstico Necesario)');
        }
      } else {
        // Hay un ganador real
        const actualWinner = realHome > realAway ? 'home' : 'away';
        const actualLoser = actualWinner === 'home' ? 'away' : 'home';
        
        let predictedWinner = '';
        if (predHome > predAway) predictedWinner = 'home';
        else if (predHome < predAway) predictedWinner = 'away';

        const isWinnerCorrect = predictedWinner === actualWinner;

        if (isWinnerCorrect) {
          pts += 1;
          breakdown.push('+1 pt por acertar el Ganador');
        }

        // Evaluar goles del ganador
        const realWinnerScore = actualWinner === 'home' ? realHome : realAway;
        const predWinnerScore = actualWinner === 'home' ? predHome : predAway;
        if (realWinnerScore === predWinnerScore) {
          pts += 3;
          breakdown.push('+3 pts por goles del Ganador');
        }

        // Evaluar goles del perdedor
        const realLoserScore = actualLoser === 'home' ? realHome : realAway;
        const predLoserScore = actualLoser === 'home' ? predHome : predAway;
        if (realLoserScore === predLoserScore) {
          pts += 2;
          breakdown.push('+2 pts por goles del Perdedor');
        }

        if (pts === 0) {
          breakdown.push('0 pts: No hubo aciertos en ganador ni en goles individuales');
        }
      }
    } else {
      // Fase Eliminatoria
      // En eliminación hay un clasificado
      const isWinnerCorrect = predWinner === realWinner;
      if (isWinnerCorrect) {
        pts += 1;
        breakdown.push('+1 pt por clasificado correcto');
      }

      const actualWinner = realWinner;
      const actualLoser = realWinner === 'home' ? 'away' : 'home';

      // Goles en los 90 min del ganador real
      const realWinnerScore = actualWinner === 'home' ? realHome : realAway;
      const predWinnerScore = actualWinner === 'home' ? predHome : predAway;
      if (realWinnerScore === predWinnerScore) {
        pts += 3;
        breakdown.push('+3 pts por goles en 90 min del Ganador');
      }

      // Goles en los 90 min del perdedor real
      const realLoserScore = actualLoser === 'home' ? realHome : realAway;
      const predLoserScore = actualLoser === 'home' ? predHome : predAway;
      if (realLoserScore === predLoserScore) {
        pts += 2;
        breakdown.push('+2 pts por goles en 90 min del Perdedor');
      }

      if (pts === 0) {
        breakdown.push('0 pts: No acertaste el clasificado ni los goles en tiempo regular');
      }
    }

    return { total: pts, breakdown };
  };

  const simResult = calculateSimulatedPoints();

  const sections: AccordionSection[] = [
    {
      id: 'grupos',
      title: 'Fase de Grupos (Puntos Básicos)',
      icon: '⚽',
      color: 'emerald',
      content: (
        <div className="space-y-3 text-neutral-300 text-xs leading-relaxed">
          <p>En cada partido de la Fase de Grupos puedes sumar un máximo de <strong className="text-emerald-400">6 puntos</strong>:</p>
          <ul className="space-y-2 pl-4 list-disc">
            <li><span className="text-emerald-400 font-bold">+1 punto</span> por acertar el resultado general (Ganador Local, Ganador Visitante o Empate).</li>
            <li><span className="text-emerald-400 font-bold">+3 puntos</span> por acertar los goles exactos del equipo Ganador.</li>
            <li><span className="text-emerald-400 font-bold">+2 puntos</span> por acertar los goles exactos del equipo Perdedor.</li>
          </ul>
          <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl mt-2">
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block mb-1">💡 Nota de Consuelo</span>
            Si no aciertas al ganador, pero el partido no fue un empate, aún puedes ganar los puntos de goles individuales (+3 y/o +2) si tus números coinciden con los del respectivo equipo real.
          </div>
        </div>
      )
    },
    {
      id: 'empates',
      title: 'El Caso Especial de los Empates',
      icon: '🤝',
      color: 'emerald',
      content: (
        <div className="space-y-3 text-neutral-300 text-xs leading-relaxed">
          <p>Los empates en fase de grupos tienen una lógica de protección del pronóstico:</p>
          <div className="space-y-2">
            <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl">
              <strong className="text-red-400 block mb-1">Regla del Pronóstico Necesario</strong>
              Para ganar puntos por goles en un partido empatado, es obligatorio que hayas pronosticado un empate (goles local = goles visitante). Si predijiste un ganador y el partido real termina en empate, obtienes <strong className="text-red-400">0 puntos en total</strong>.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl">
                <strong className="text-white block mb-0.5">Empate Exacto (Ej: 1-1 real, 1-1 predicho)</strong>
                <span className="text-emerald-400 font-bold">Suma 3 puntos:</span>
                <ul className="list-inside list-circle text-[11px] text-neutral-400 mt-1">
                  <li>+1 por acertar Empate</li>
                  <li>+1 por goles de Local</li>
                  <li>+1 por goles de Visitante</li>
                </ul>
              </div>
              <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl">
                <strong className="text-white block mb-0.5">Empate Parcial (Ej: 1-1 real, 2-2 predicho)</strong>
                <span className="text-emerald-400 font-bold">Suma 1 punto:</span>
                <ul className="list-inside list-circle text-[11px] text-neutral-400 mt-1">
                  <li>+1 por acertar Empate</li>
                  <li>0 pts de goles (no coinciden)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'eliminatorias',
      title: 'Fases Eliminatorias (90 Min + Clasificado)',
      icon: '🔥',
      color: 'gold',
      content: (
        <div className="space-y-3 text-neutral-300 text-xs leading-relaxed">
          <p>En las rondas de eliminación directa (Knockouts), la lógica se divide entre el tiempo regular de juego y el clasificado definitivo:</p>
          <ul className="space-y-2 pl-4 list-disc">
            <li><span className="text-amber-500 font-bold">+1 punto (Clasificado)</span>: Por acertar el equipo que avanza a la siguiente ronda, sin importar si lo logra en los 90 minutos, tiempo extra o mediante penales.</li>
            <li><span className="text-emerald-400 font-bold">Goles en Tiempo Regular (90 min)</span>: Se evalúan los goles anotados en los 90 minutos de juego (más la adición). Se excluyen prórrogas y penales. Acertar goles del ganador da <strong className="text-emerald-400">+3 pts</strong> y del perdedor <strong className="text-emerald-400">+2 pts</strong>.</li>
          </ul>
          <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl text-[11px]">
            <strong className="text-white block mb-1">Ejemplo:</strong>
            Si predices que avanza España empatando 1-1 con Alemania, y el partido real termina 1-1 en los 90 minutos y avanza España en penales, sumas: +1 por avance de España, +3 por goles del ganador de 90 min, +2 por goles del perdedor = <strong className="text-emerald-400">6 puntos</strong>.
          </div>
        </div>
      )
    },
    {
      id: 'formatos',
      title: 'Formatos: Wizard (Parte 1) vs En Vivo (Parte 2)',
      icon: '🔮',
      color: 'gold',
      content: (
        <div className="space-y-3 text-neutral-300 text-xs leading-relaxed">
          <p>El portal opera con dos modalidades de juego completamente diferenciadas:</p>
          <div className="space-y-2">
            <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl">
              <strong className="text-amber-500 block mb-1">🔮 Parte 1: La Gran Polla (Wizard)</strong>
              Pronosticas todo el fixture del mundial antes de que comience el partido inaugural.
              <p className="mt-1 text-neutral-400 text-[11px]">
                <strong className="text-red-400">Regla de Coincidencia:</strong> En fases finales de la Parte 1, los dos equipos reales de un partido deben coincidir exactamente con los que tú predijiste que jugarían en esa posición del bracket. Si no coinciden, obtienes <strong>0 puntos</strong> en ese partido.
              </p>
            </div>
            <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl">
              <strong className="text-emerald-400 block mb-1">⚽ Parte 2: La Polla en Vivo</strong>
              Pronosticas partido a partido del fixture real a medida que clasifiquen.
              <p className="mt-1 text-neutral-400 text-[11px]">
                Juegas siempre con los equipos reales. El pronóstico de cada partido se bloquea individualmente <strong>1 hora antes</strong> de su inicio real. Sumas puntos directo según marcador.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'bonus',
      title: 'Bonus de Campeones (Podio Final)',
      icon: '🏆',
      color: 'gold',
      content: (
        <div className="space-y-3 text-neutral-300 text-xs leading-relaxed">
          <p>Al finalizar el Mundial (tras concluir la final), se evalúa tu predicción del podio cargada en la Parte 1:</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-neutral-900/80 border border-amber-500/20 text-center rounded-xl">
              <div className="text-xl">🥇</div>
              <strong className="text-amber-500 text-xs block mt-1">Campeón</strong>
              <span className="text-emerald-400 font-black text-sm">+5 pts</span>
            </div>
            <div className="p-3 bg-neutral-900/80 border border-neutral-800 text-center rounded-xl">
              <div className="text-xl">🥈</div>
              <strong className="text-neutral-300 text-xs block mt-1">Subcampeón</strong>
              <span className="text-emerald-400 font-black text-sm">+3 pts</span>
            </div>
            <div className="p-3 bg-neutral-900/80 border border-neutral-800 text-center rounded-xl">
              <div className="text-xl">🥉</div>
              <strong className="text-amber-700 text-xs block mt-1">3er Lugar</strong>
              <span className="text-emerald-400 font-black text-sm">+2 pts</span>
            </div>
          </div>
          <p className="text-[11px] text-neutral-400 italic text-center mt-1">
            Puedes sumar un máximo de <strong>10 puntos</strong> adicionales si aciertas el podio completo.
          </p>
        </div>
      )
    }
  ];

  return (
    <div className="w-full space-y-6 bg-[#121212] text-white">
      
      {/* Listado de Acordeones */}
      <div className="space-y-2.5">
        {sections.map((sec) => {
          const isOpen = openSection === sec.id;
          const borderAccent = sec.color === 'gold' ? 'border-l-amber-500' : 'border-l-emerald-500';

          return (
            <div 
              key={sec.id} 
              className={`rounded-xl border border-neutral-800/80 bg-neutral-950/40 overflow-hidden transition-all duration-200 ${
                isOpen ? `border-l-4 ${borderAccent} shadow-lg shadow-neutral-950/50` : 'hover:bg-neutral-900/20'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenSection(isOpen ? '' : sec.id)}
                className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-sm transition focus:outline-none"
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">{sec.icon}</span>
                  <span className={isOpen ? 'text-white' : 'text-neutral-300'}>{sec.title}</span>
                </span>
                <span className={`text-xs text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              
              {isOpen && (
                <div className="px-5 pb-5 pt-1 border-t border-neutral-900 bg-neutral-950/20 animate-slideDown">
                  {sec.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Widget Simulador Interactivo Premium */}
      <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 shadow-inner">
        <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
          🧮 Simulador de Puntuación en Tiempo Real
        </h4>
        
        {/* Selector de fase */}
        <div className="flex gap-2 p-1 bg-neutral-950 border border-neutral-800 rounded-lg mb-4">
          <button
            type="button"
            onClick={() => setSimPhase('group')}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition ${
              simPhase === 'group' ? 'bg-emerald-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Fase de Grupos
          </button>
          <button
            type="button"
            onClick={() => setSimPhase('knockout')}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition ${
              simPhase === 'knockout' ? 'bg-emerald-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Eliminatorias
          </button>
        </div>

        {/* Inputs del Simulador */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Marcador Real */}
          <div className="space-y-2.5 p-3 rounded-xl bg-neutral-950/60 border border-neutral-900">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Resultado Real</span>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-neutral-400">Local</span>
                <input 
                  type="number" 
                  min={0}
                  value={realHome}
                  onChange={(e) => setRealHome(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-12 py-1 text-center bg-neutral-900 border border-neutral-800 rounded text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="text-neutral-500 font-bold text-xs">vs</span>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-neutral-400">Visitante</span>
                <input 
                  type="number" 
                  min={0}
                  value={realAway}
                  onChange={(e) => setRealAway(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-12 py-1 text-center bg-neutral-900 border border-neutral-800 rounded text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {simPhase === 'knockout' && (
              <div className="mt-2.5 pt-2 border-t border-neutral-900">
                <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block mb-1">Clasifica Real:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={realHome !== realAway}
                    onClick={() => setRealWinner('home')}
                    className={`flex-1 py-1 text-[10px] font-bold rounded transition ${
                      realWinner === 'home' ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-900 text-neutral-400'
                    } ${realHome !== realAway ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}`}
                  >
                    Local
                  </button>
                  <button
                    type="button"
                    disabled={realHome !== realAway}
                    onClick={() => setRealWinner('away')}
                    className={`flex-1 py-1 text-[10px] font-bold rounded transition ${
                      realWinner === 'away' ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-900 text-neutral-400'
                    } ${realHome !== realAway ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}`}
                  >
                    Visitante
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Marcador Pronosticado */}
          <div className="space-y-2.5 p-3 rounded-xl bg-neutral-950/60 border border-neutral-900">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Mi Pronóstico</span>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-neutral-400">Local</span>
                <input 
                  type="number" 
                  min={0}
                  value={predHome}
                  onChange={(e) => setPredHome(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-12 py-1 text-center bg-neutral-900 border border-neutral-800 rounded text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="text-neutral-500 font-bold text-xs">vs</span>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-neutral-400">Visitante</span>
                <input 
                  type="number" 
                  min={0}
                  value={predAway}
                  onChange={(e) => setPredAway(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-12 py-1 text-center bg-neutral-900 border border-neutral-800 rounded text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {simPhase === 'knockout' && (
              <div className="mt-2.5 pt-2 border-t border-neutral-900">
                <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block mb-1">Mi Clasificado:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={predHome !== predAway}
                    onClick={() => setPredWinner('home')}
                    className={`flex-1 py-1 text-[10px] font-bold rounded transition ${
                      predWinner === 'home' ? 'bg-emerald-600 text-white' : 'bg-neutral-900 text-neutral-400'
                    } ${predHome !== predAway ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}`}
                  >
                    Local
                  </button>
                  <button
                    type="button"
                    disabled={predHome !== predAway}
                    onClick={() => setPredWinner('away')}
                    className={`flex-1 py-1 text-[10px] font-bold rounded transition ${
                      predWinner === 'away' ? 'bg-emerald-600 text-white' : 'bg-neutral-900 text-neutral-400'
                    } ${predHome !== predAway ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}`}
                  >
                    Visitante
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resultado de la Simulación */}
        <div className="mt-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-left w-full md:w-auto">
            <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block">Desglose de Puntos</span>
            <ul className="text-xs text-neutral-400 list-inside list-disc mt-1 space-y-0.5">
              {simResult.breakdown.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="text-center md:text-right w-full md:w-auto p-3 bg-neutral-900 border border-neutral-800 rounded-xl min-w-[120px]">
            <span className="text-[9px] text-neutral-400 font-bold uppercase block">Puntos Ganados</span>
            <span className="text-3xl font-black text-emerald-400">{simResult.total} pts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
