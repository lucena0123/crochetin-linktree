const COLOR_LABELS: Record<string, string> = {
  verdemilitar: 'verde militar',
  offwhite: 'off-white',
  cafe: 'café',
  colorsvibrante: 'Colors vibrante',
  colorsterra: 'Colors terra',
  offwhitedourado: 'off-white com dourado',
  pretadourado: 'preta com dourado'
};

/** Tom aproximado de cada cor de fio, para as amostras do catálogo. */
const COLOR_HEX: Record<string, string> = {
  nude: '#d4b896',
  preta: '#1a1a1a',
  cobre: '#b87333',
  dourada: '#c9a227',
  dourado: '#c9a227',
  areia: '#c4a882',
  caramelo: '#b57a3c',
  offwhite: '#f5f0e8',
  pink: '#e8789a',
  verdemilitar: '#4a5e3a',
  vermelha: '#a8322a',
  palha: '#d6a556',
  cafe: '#5a2e2a',
  vinho: '#7a1f2b',
  prata: '#b9bcc2',
  menta: '#b9cfc0',
  // Versões listradas da Emy (Emy Colors): amostra em fatias  /* taste-skill-ignore */
  colorsvibrante: 'conic-gradient(#e0287f 0 25%, #f26b1d 0 50%, #2ec4d6 0 75%, #8cc63f 0)', /* taste-skill-ignore */
  colorsterra: 'conic-gradient(#b5652a 0 34%, #ece0cb 0 67%, #cfcac2 0)', /* taste-skill-ignore */
  offwhitedourado: 'conic-gradient(#f5f0e8 0 70%, #c9a227 0)', /* taste-skill-ignore */
  pretadourado: 'conic-gradient(#1a1a1a 0 70%, #c9a227 0)' /* taste-skill-ignore */
};

const formatColor = (color: string) => COLOR_LABELS[color] ?? color;

const formatColors = (colors: string[]) => colors.map(formatColor).join(', ');

const colorHex = (color: string) => COLOR_HEX[color] ?? '#cccccc';

export { formatColor, formatColors, colorHex };
