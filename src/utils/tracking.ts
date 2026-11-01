/**
 * Adiciona os parâmetros de origem da Hotmart (src/sck) aos links que levam
 * para a Hotmart, para que o relatório de vendas mostre de onde veio cada venda.
 * - src: origem fixa do site
 * - sck: ponto exato do clique (ex.: "home", "aulas_bag-mari")
 * Links que não são da Hotmart voltam sem alteração.
 */
export const HOTMART_SRC = 'site_crochetin';

export function withHotmartSource(url: string | undefined, sck: string): string {
  if (!url) return '';
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url; // link relativo/interno
  }
  const isHotmart = /(^|\.)hotmart\.(com|host)$/.test(parsed.hostname);
  if (!isHotmart) return url;
  if (!parsed.searchParams.has('src')) parsed.searchParams.set('src', HOTMART_SRC);
  if (!parsed.searchParams.has('sck')) parsed.searchParams.set('sck', sck);
  return parsed.toString();
}
