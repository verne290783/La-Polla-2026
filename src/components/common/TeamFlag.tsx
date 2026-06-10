import React from 'react';

const FLAG_MAP: Record<string, string> = {
  MEX: 'mx', RSA: 'za', KOR: 'kr', CZE: 'cz',
  CAN: 'ca', SUI: 'ch', QAT: 'qa', BIH: 'ba',
  BRA: 'br', MAR: 'ma', HAI: 'ht', SCO: 'gb-sct',
  USA: 'us', PAR: 'py', AUS: 'au', TUR: 'tr',
  GER: 'de', CUW: 'cw', CIV: 'ci', ECU: 'ec',
  NED: 'nl', JPN: 'jp', SWE: 'se', TUN: 'tn',
  BEL: 'be', EGY: 'eg', IRN: 'ir', NZL: 'nz',
  ESP: 'es', CPV: 'cv', KSA: 'sa', URU: 'uy',
  FRA: 'fr', SEN: 'sn', NOR: 'no', IRQ: 'iq',
  ARG: 'ar', ALG: 'dz', AUT: 'at', JOR: 'jo',
  POR: 'pt', COD: 'cd', UZB: 'uz', COL: 'co',
  ENG: 'gb-eng', CRO: 'hr', GHA: 'gh', PAN: 'pa'
};

interface TeamFlagProps {
  teamId?: string;
  fallbackEmoji?: string;
  className?: string;
}

export default function TeamFlag({ teamId, fallbackEmoji = '🏳️', className = 'w-7 h-5' }: TeamFlagProps) {
  if (!teamId) {
    return <span className="inline-block text-xl">{fallbackEmoji}</span>;
  }
  
  const code = FLAG_MAP[teamId.toUpperCase()];
  if (!code) {
    return <span className="inline-block text-xl">{fallbackEmoji}</span>;
  }
  
  return (
    <span className="inline-flex items-center justify-center">
      <img
        src={`https://flagcdn.com/w80/${code}.png`}
        alt={teamId}
        className={`object-cover rounded-sm shadow-sm ${className}`}
        style={{ aspectRatio: '3/2' }}
        onError={(e) => {
          // Si falla, ocultar la imagen y mostrar el emoji de fallback
          (e.currentTarget as HTMLImageElement).style.display = 'none';
          const sibling = (e.currentTarget as HTMLImageElement).nextSibling as HTMLElement;
          if (sibling) sibling.style.display = 'inline-block';
        }}
      />
      <span className="hidden text-xl">{fallbackEmoji}</span>
    </span>
  );
}
