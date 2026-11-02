const COLOR_LABELS: Record<string, string> = {
  verdemilitar: 'verde militar',
  offwhite: 'off-white',
  cafe: 'café'
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
  vinho: '#7a1f2b'
};

const formatColor = (color: string) => COLOR_LABELS[color] ?? color;

const formatColors = (colors: string[]) => colors.map(formatColor).join(', ');

const colorHex = (color: string) => COLOR_HEX[color] ?? '#cccccc';

export { formatColor, formatColors, colorHex };
