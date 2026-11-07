/**
 * Feed de produtos para o catálogo da Meta (Gerenciador de Comércio).
 * Gerado a partir de products.json a cada deploy, então preço e bolsa nova
 * mudam aqui sozinhos. A Meta lê este arquivo numa programação diária e usa o
 * mesmo catálogo no WhatsApp, no Instagram e nos anúncios.
 * Um item por bolsa; as fotos das outras cores vão em additional_image_link.
 */
import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import productsData from '../data/products.json';
import { getProductImage } from '../utils/productImages';
import { formatColors } from '../utils/colorLabels';
import type { Product } from '../types/product';

const SITE = 'https://crochetin.com.br';
const cols = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link',
  'additional_image_link', 'brand', 'material', 'google_product_category', 'custom_label_0'];

const esc = (v: string) => `"${String(v).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

async function jpg(file: string) {
  const src = getProductImage(file);
  if (!src) return null;
  const img = await getImage({ src, width: 1080, format: 'jpg', quality: 85 });
  return new URL(img.src, SITE).toString();
}

export const GET: APIRoute = async () => {
  const products = (productsData.products as Product[]).filter((p) => p.inStock !== false);
  const rows: string[] = [cols.join(',')];
  for (const p of products) {
    const imgs = (await Promise.all(p.images.map(jpg))).filter(Boolean) as string[];
    if (!imgs.length) continue;
    const d = p.dimensions;
    const n = (v: number) => String(v).replace('.', ',');
    const size = d ? `${n(d.width)} × ${n(d.height)}${d.depth ? ` × ${n(d.depth)} cm` : ' cm (aproximado)'}` : '';
    const description = [
      p.description,
      `Cores: ${formatColors(p.colors)}.`,
      size && `Medidas: ${size}.`,
      'Feita à mão em Maceió. Envio para todo o Brasil. Até 3x sem juros no cartão.',
    ].filter(Boolean).join(' ');
    rows.push([
      p.slug,
      p.name,
      description,
      'in stock',
      'new',
      `${p.price.toFixed(2)} BRL`,
      `${SITE}/catalogo/${p.slug}?utm_source=meta&utm_medium=catalogo`,
      imgs[0],
      imgs.slice(1, 10).join(','),
      'Crochetin',
      p.material ?? '',
      'Apparel & Accessories > Handbags, Wallets & Cases > Handbags',
      p.lessons ? 'com_aula' : 'sem_aula',
    ].map(esc).join(','));
  }
  return new Response(rows.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/csv; charset=utf-8' },
  });
};
