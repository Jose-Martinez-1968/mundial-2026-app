import React from 'react';

// Map FIFA codes to ISO 3166-1 alpha-2 (lowercase) for flagcdn.com
const CODE_TO_ISO: Record<string, string> = {
  // Group A
  MEX: 'mx', RSA: 'za', KOR: 'kr', CZE: 'cz',
  // Group B
  CAN: 'ca', BIH: 'ba', QAT: 'qa', SUI: 'ch',
  // Group C
  BRA: 'br', MAR: 'ma', HAI: 'ht', SCO: 'gb-sct',
  // Group D
  USA: 'us', PAR: 'py', AUS: 'au', TUR: 'tr',
  // Group E
  GER: 'de', CUW: 'cw', CIV: 'ci', ECU: 'ec',
  // Group F
  NED: 'nl', JPN: 'jp', SWE: 'se', TUN: 'tn',
  // Group G
  BEL: 'be', EGY: 'eg', IRN: 'ir', NZL: 'nz',
  // Group H
  ESP: 'es', URU: 'uy', KSA: 'sa', CPV: 'cv',
  // Group I
  FRA: 'fr', SEN: 'sn', NOR: 'no', IRQ: 'iq',
  // Group J
  ARG: 'ar', ALG: 'dz', AUT: 'at', JOR: 'jo',
  // Group K
  POR: 'pt', COL: 'co', UZB: 'uz', COD: 'cd',
  // Group L
  ENG: 'gb-eng', CRO: 'hr', PAN: 'pa', GHA: 'gh',
};

// Also support name-based lookup for matches.json data (EN + ES)
const NAME_TO_ISO: Record<string, string> = {
  'Mexico': 'mx', 'México': 'mx', 'South Africa': 'za', 'Sudáfrica': 'za',
  'South Korea': 'kr', 'Corea del Sur': 'kr', 'Czechia': 'cz', 'Chequia': 'cz',
  'Canada': 'ca', 'Canadá': 'ca', 'Bosnia and Herzegovina': 'ba', 'Bosnia': 'ba',
  'Qatar': 'qa', 'Switzerland': 'ch', 'Suiza': 'ch',
  'Brazil': 'br', 'Brasil': 'br', 'Morocco': 'ma', 'Marruecos': 'ma',
  'Haiti': 'ht', 'Haití': 'ht', 'Scotland': 'gb-sct', 'Escocia': 'gb-sct',
  'USA': 'us', 'Estados Unidos': 'us', 'Paraguay': 'py',
  'Australia': 'au', 'Türkiye': 'tr', 'Turkey': 'tr', 'Turquía': 'tr',
  'Germany': 'de', 'Alemania': 'de', 'Curaçao': 'cw', 'Curazao': 'cw',
  'Ivory Coast': 'ci', 'Costa de Marfil': 'ci', 'Ecuador': 'ec',
  'Netherlands': 'nl', 'Países Bajos': 'nl', 'Holanda': 'nl',
  'Japan': 'jp', 'Japón': 'jp', 'Sweden': 'se', 'Suecia': 'se',
  'Tunisia': 'tn', 'Túnez': 'tn',
  'Belgium': 'be', 'Bélgica': 'be', 'Egypt': 'eg', 'Egipto': 'eg',
  'Iran': 'ir', 'Irán': 'ir', 'New Zealand': 'nz', 'Nueva Zelanda': 'nz',
  'Spain': 'es', 'España': 'es', 'Uruguay': 'uy',
  'Saudi Arabia': 'sa', 'Arabia Saudita': 'sa', 'Cabo Verde': 'cv',
  'France': 'fr', 'Francia': 'fr', 'Senegal': 'sn',
  'Norway': 'no', 'Noruega': 'no', 'Iraq': 'iq', 'Irak': 'iq',
  'Argentina': 'ar', 'Algeria': 'dz', 'Argelia': 'dz',
  'Austria': 'at', 'Jordan': 'jo', 'Jordania': 'jo',
  'Portugal': 'pt', 'Colombia': 'co',
  'Uzbekistan': 'uz', 'Uzbekistán': 'uz', 'DR Congo': 'cd', 'RD Congo': 'cd',
  'England': 'gb-eng', 'Inglaterra': 'gb-eng',
  'Croatia': 'hr', 'Croacia': 'hr', 'Panama': 'pa', 'Panamá': 'pa',
  'Ghana': 'gh',
};

interface FlagProps {
  code?: string;
  name?: string;
  size?: number;
  className?: string;
}

export const Flag: React.FC<FlagProps> = ({ code, name, size = 32, className = '' }) => {
  let iso = '';

  if (code && CODE_TO_ISO[code]) {
    iso = CODE_TO_ISO[code];
  } else if (name && NAME_TO_ISO[name]) {
    iso = NAME_TO_ISO[name];
  }

  if (!iso) {
    return (
      <div
        className={`inline-flex items-center justify-center bg-slate-700 rounded text-slate-400 text-xs font-bold ${className}`}
        style={{ width: size, height: size * 0.75 }}
      >
        {code || '?'}
      </div>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/${iso}.svg`}
      alt={name || code || 'flag'}
      width={size}
      height={size * 0.75}
      className={`inline-block rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.3)] object-cover border border-white/10 ${className}`}
      loading="lazy"
    />
  );
};

export default Flag;
