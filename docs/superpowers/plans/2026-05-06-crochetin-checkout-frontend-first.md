# Crochetin — Checkout Frontend-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o checkout via Mercado Pago com abordagem frontend-first — corrigir bugs, instalar Pixel, construir UI de checkout no Astro e scaffoldar a API Fastify localmente, sem bloquear em pré-requisitos externos.

**Architecture:** O frontend Astro (GitHub Pages) envia `POST /checkout { slug, color }` para `api.crochetin.com.br` (Fastify no VPS). A API cria uma preferência no Mercado Pago e retorna `init_point`. O frontend redireciona para o checkout hospedado do MP. Após pagamento aprovado, MP redireciona para `/obrigada` onde o evento `Purchase` é disparado no Meta Pixel.

**Tech Stack:** Astro 5.x · TypeScript strict · `@fontsource/*` · Fastify 5.x · `mercadopago` SDK · Vitest · Docker

---

## Mapa de Arquivos

### crochetin-linktree (Astro)

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/pages/catalogo/[slug].astro` | Modificar | Fix replaceAll, JSON-LD, seletor de cor, botão comprar |
| `src/layouts/BaseLayout.astro` | Modificar | Remover Google Fonts CDN, importar fontsource, Meta Pixel |
| `src/data/products.json` | Modificar | Adicionar bag-tati e bag-emy |
| `src/pages/aulas-avulsas/index.astro` | Modificar | Migrar hardcode para JSON |
| `src/pages/obrigada.astro` | Criar | Página de confirmação de pagamento |
| `src/pages/catalogo/index.astro` | Modificar | Filtrar produtos com `inStock: false` |
| `package.json` | Modificar | Adicionar @fontsource deps |

### crochetin-api (Fastify — repo separado)

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `package.json` | Criar | Deps: fastify, cors, mercadopago, dotenv, vitest |
| `tsconfig.json` | Criar | NodeNext, strict |
| `src/app.ts` | Criar | Factory `buildApp()` — testável sem servidor |
| `src/server.ts` | Criar | Entry point: chama `buildApp().listen()` |
| `src/products.ts` | Criar | Catálogo de produtos (espelho do products.json) |
| `src/routes/checkout.ts` | Criar | `POST /checkout` + `POST /webhook` |
| `src/routes/checkout.test.ts` | Criar | Testes Vitest com Fastify inject |
| `.env.example` | Criar | Template de variáveis de ambiente |
| `Dockerfile` | Criar | Build de produção node:20-alpine |

---

## Parte 1 — crochetin-linktree (Astro)

---

### Task 1: Fix bug category.replaceAll

**Files:**
- Modify: `src/pages/catalogo/[slug].astro:193`

- [ ] **Step 1: Localizar e corrigir o bug**

Abrir `src/pages/catalogo/[slug].astro` linha 193. Substituir:

```ts
// ANTES
product.category.replace('-', ' ')

// DEPOIS
product.category.replaceAll('-', ' ')
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx astro check
```

Esperado: zero erros.

- [ ] **Step 3: Commit**

```bash
git add src/pages/catalogo/[slug].astro
git commit -m "fix: use replaceAll to replace all hyphens in category label"
```

---

### Task 2: Self-host de fontes

**Files:**
- Modify: `package.json`
- Modify: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Instalar pacotes de fonte**

```bash
npm install @fontsource/outfit @fontsource/playfair-display
```

Verificar que apareceram em `package.json` como dependências.

- [ ] **Step 2: Importar fontes no BaseLayout.astro**

No frontmatter de `src/layouts/BaseLayout.astro` (bloco `---`), adicionar:

```ts
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
```

- [ ] **Step 3: Remover Google Fonts CDN**

Localizar e remover as seguintes linhas do `<head>` em `src/layouts/BaseLayout.astro`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 4: Verificar build e inspecionar rede**

```bash
npx astro build
```

Esperado: build sem erros, output em `docs/`.

Iniciar dev e confirmar visualmente que fontes carregam:
```bash
npx astro dev
```
Abrir `http://localhost:4321` → DevTools → Network → filtrar por "fonts.googleapis" → nenhuma requisição deve aparecer.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/layouts/BaseLayout.astro
git commit -m "perf: self-host Outfit and Playfair Display fonts"
```

---

### Task 3: JSON-LD Product schema

**Files:**
- Modify: `src/pages/catalogo/[slug].astro`

- [ ] **Step 1: Adicionar variáveis para JSON-LD no frontmatter**

No bloco `---` de `src/pages/catalogo/[slug].astro`, adicionar após as variáveis existentes:

```ts
const siteUrl = 'https://crochetin.com.br';
const productUrl = `${siteUrl}/catalogo/${slug}`;
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  "name": product.name,
  "description": product.description,
  "brand": { "@type": "Brand", "name": "Crochetin" },
  "offers": {
    "@type": "Offer",
    "price": product.price,
    "priceCurrency": "BRL",
    "availability": product.inStock
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    "url": productUrl
  }
};
```

- [ ] **Step 2: Injetar script JSON-LD no `<head>`**

O `[slug].astro` provavelmente passa props para o layout com um slot `<head>`. Localizar onde o título/meta da página são definidos e adicionar junto:

```astro
<script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
```

Se o layout usa um prop `head` ou slot nomeado, injetar ali. Se não houver slot, adicionar diretamente no `<head>` via o layout existente.

- [ ] **Step 3: Verificar TypeScript e build**

```bash
npx astro check && npx astro build
```

Esperado: zero erros.

- [ ] **Step 4: Validar JSON-LD**

```bash
npx astro dev
```

Abrir `http://localhost:4321/catalogo/bag-mari` → DevTools → Elements → buscar `application/ld+json` → confirmar que o JSON está presente e correto.

- [ ] **Step 5: Commit**

```bash
git add src/pages/catalogo/[slug].astro
git commit -m "feat: add JSON-LD Product schema to catalog pages"
```

---

### Task 4: Migrar Bag Tati + Bag Emy para products.json

**Files:**
- Modify: `src/data/products.json`
- Modify: `src/pages/aulas-avulsas/index.astro`
- Modify: `src/pages/catalogo/index.astro`

- [ ] **Step 1: Adicionar produtos ao products.json**

Abrir `src/data/products.json`. Seguindo a estrutura dos produtos existentes, adicionar ao array:

```json
{
  "id": "bolsa-006",
  "slug": "bag-tati",
  "name": "Bag Tati",
  "description": "Bolsa artesanal em crochê — disponível como aula avulsa",
  "price": 0,
  "lessonUrl": "https://pay.hotmart.com/M103664998T?bid=1767571051716",
  "category": "bolsa-casual",
  "images": ["bag-tati.png"],
  "colors": [],
  "material": "Crochê",
  "dimensions": { "width": 0, "height": 0, "depth": 0 },
  "benefits": [],
  "inStock": false,
  "featured": false,
  "tags": ["aula-avulsa"]
},
{
  "id": "bolsa-007",
  "slug": "bag-emy",
  "name": "Bag Emy",
  "description": "Bolsa artesanal em crochê — disponível como aula avulsa",
  "price": 0,
  "lessonUrl": "https://pay.hotmart.com/N103794966L?bid=1768094794890",
  "category": "bolsa-casual",
  "images": ["bag-emy.png"],
  "colors": [],
  "material": "Crochê",
  "dimensions": { "width": 0, "height": 0, "depth": 0 },
  "benefits": [],
  "inStock": false,
  "featured": false,
  "tags": ["aula-avulsa"]
}
```

- [ ] **Step 2: Adicionar slugs ao array lessonProductSlugs em aulas-avulsas**

Abrir `src/pages/aulas-avulsas/index.astro`. Localizar:

```ts
const lessonProductSlugs = ['bag-mari', 'bag-ariel', 'bag-atena'];
```

Substituir por:

```ts
const lessonProductSlugs = ['bag-mari', 'bag-ariel', 'bag-atena', 'bag-tati', 'bag-emy'];
```

- [ ] **Step 3: Remover os objetos hardcoded de Bag Tati e Bag Emy**

No mesmo arquivo, localizar e remover os blocos hardcoded com `title: 'Bag Tati'` e `title: 'Bag Emy'` (incluindo seus URLs hardcoded do Hotmart). A lógica dinâmica existente agora os buscará do products.json via `lessonProductSlugs`.

- [ ] **Step 4: Filtrar produtos inStock: false no catálogo e no getStaticPaths**

**4a — catalog/index.astro:** Localizar onde os produtos são listados e filtrar:

```ts
// Localizar algo como:
const allProducts = products;

// Substituir por:
const allProducts = products.filter((p: Product) => p.inStock !== false);
```

**4b — catalogo/[slug].astro:** Localizar a função `getStaticPaths()` e adicionar o mesmo filtro para que `/catalogo/bag-tati` e `/catalogo/bag-emy` não sejam geradas como páginas estáticas:

```ts
export async function getStaticPaths() {
  // Localizar onde products é importado/mapeado. Adicionar filtro:
  return products
    .filter((p: Product) => p.inStock !== false)
    .map((p: Product) => ({ params: { slug: p.slug } }));
}
```

- [ ] **Step 5: Verificar TypeScript e build**

```bash
npx astro check && npx astro build
```

Esperado: zero erros.

- [ ] **Step 6: Verificar visualmente**

```bash
npx astro dev
```

- Abrir `http://localhost:4321/aulas-avulsas` → confirmar que Bag Tati e Bag Emy aparecem com link "Comprar aula avulsa" apontando para os URLs do Hotmart corretos.
- Abrir `http://localhost:4321/catalogo` → confirmar que Bag Tati e Bag Emy NÃO aparecem na grade.

- [ ] **Step 7: Commit**

```bash
git add src/data/products.json src/pages/aulas-avulsas/index.astro src/pages/catalogo/index.astro
git commit -m "feat: migrate Bag Tati and Bag Emy from hardcode to products.json"
```

---

### Task 5: Instalar Meta Pixel

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Adicionar snippet do Meta Pixel no BaseLayout.astro**

No `<head>` de `src/layouts/BaseLayout.astro`, adicionar antes de `</head>`:

```html
<!-- Meta Pixel — substituir PIXEL_ID_PLACEHOLDER pelo ID real -->
<script is:inline>
  var PIXEL_ID = 'PIXEL_ID_PLACEHOLDER';
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');
</script>
<noscript>
  <img height="1" width="1" style="display:none"
    src={"https://www.facebook.com/tr?id=PIXEL_ID_PLACEHOLDER&ev=PageView&noscript=1"}
  />
</noscript>
```

**Nota:** `is:inline` é necessário para que o Astro não processe o script. O `PIXEL_ID_PLACEHOLDER` será substituído pelo ID real quando a dona confirmar no Meta Business Manager.

- [ ] **Step 2: Verificar build**

```bash
npx astro check && npx astro build
```

Esperado: zero erros.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat: add Meta Pixel base snippet (placeholder ID)"
```

---

### Task 6: Seletor de cor (bolinhas)

**Files:**
- Modify: `src/pages/catalogo/[slug].astro`

- [ ] **Step 1: Adicionar mapa de cores no frontmatter**

No bloco `---` de `src/pages/catalogo/[slug].astro`, adicionar:

```ts
const colorHex: Record<string, string> = {
  nude: '#d4b896',
  preta: '#1a1a1a',
  cobre: '#b87333',
  dourada: '#d4af37',
  dourado: '#d4af37',
  areia: '#c4a882',
  caramelo: '#c68642',
  offwhite: '#f5f0e8',
  pink: '#f4a0b5',
  verdemilitar: '#4a5e3a',
  vermelha: '#c0392b',
};
```

- [ ] **Step 2: Adicionar markup do seletor de cor**

No template, localizar a seção de ação/compra do produto (onde o botão WhatsApp do produto — não o sticky — está). Adicionar o seletor ACIMA do botão de compra:

```astro
{product.colors?.length > 0 && (
  <div class="color-selector">
    <p class="color-label">Escolha a cor:</p>
    <div class="color-options">
      {product.colors.map((color: string) => (
        <button
          class="color-btn"
          data-color={color}
          style={`background-color: ${colorHex[color] ?? '#ccc'}`}
          aria-label={color}
          title={color}
        />
      ))}
    </div>
    <p id="color-error" class="color-error" hidden>
      Selecione uma cor antes de continuar
    </p>
  </div>
)}
```

- [ ] **Step 3: Adicionar CSS do seletor**

Na `<style>` do arquivo (ou em `src/styles/global.css`):

```css
.color-selector {
  margin-bottom: 16px;
}

.color-label {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.color-options {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.color-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.2s, outline 0.2s;
  padding: 0;
}

.color-btn:hover {
  border-color: #be996f;
}

.color-btn.selected {
  border-color: #be996f;
  outline: 2px solid #be996f;
  outline-offset: 2px;
}

.color-error {
  color: #e53e3e;
  font-size: 0.85rem;
  margin-top: 6px;
}
```

- [ ] **Step 4: Adicionar script de seleção de cor**

No bloco `<script>` do arquivo (criar se não existir):

```ts
document.querySelectorAll<HTMLButtonElement>('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const errorEl = document.getElementById('color-error');
    if (errorEl) errorEl.hidden = true;
  });
});
```

- [ ] **Step 5: Verificar TypeScript e build**

```bash
npx astro check && npx astro build
```

Esperado: zero erros.

- [ ] **Step 6: Verificar visualmente**

```bash
npx astro dev
```

Abrir `http://localhost:4321/catalogo/bag-mari` → confirmar que as bolinhas aparecem, clicando muda a selecionada com borda dourada.

- [ ] **Step 7: Commit**

```bash
git add src/pages/catalogo/[slug].astro
git commit -m "feat: add color selector (colored circles) to product page"
```

---

### Task 7: Botão "Comprar agora" + script de checkout

**Files:**
- Modify: `src/pages/catalogo/[slug].astro`

- [ ] **Step 1: Adicionar o botão no template**

Logo após o seletor de cor (Task 6), adicionar:

```astro
<button id="btn-comprar" class="btn-comprar" data-slug={slug}>
  🛒 Comprar agora
</button>
<p id="comprar-error" class="comprar-error" hidden>
  Erro ao iniciar pagamento. Tente novamente.
</p>
```

- [ ] **Step 2: Adicionar CSS do botão**

Na `<style>` do arquivo:

```css
.btn-comprar {
  width: 100%;
  padding: 14px 24px;
  background: #be996f;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 8px;
}

.btn-comprar:hover:not(:disabled) {
  background: #a8845a;
}

.btn-comprar:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.comprar-error {
  color: #e53e3e;
  font-size: 0.85rem;
  margin-top: 6px;
  text-align: center;
}
```

- [ ] **Step 3: Adicionar lógica de checkout ao script existente**

No bloco `<script>` do arquivo (onde foi adicionado o código do seletor na Task 6), adicionar:

```ts
const btnComprar = document.getElementById('btn-comprar') as HTMLButtonElement | null;
const comprarError = document.getElementById('comprar-error') as HTMLParagraphElement | null;

btnComprar?.addEventListener('click', async () => {
  const slug = btnComprar.dataset.slug!;
  const hasColors = document.querySelector('.color-selector');
  const selectedColor = document.querySelector<HTMLButtonElement>('.color-btn.selected')?.dataset.color;
  const colorError = document.getElementById('color-error');

  if (hasColors && !selectedColor) {
    if (colorError) colorError.hidden = false;
    return;
  }

  btnComprar.textContent = '⏳ Aguarde...';
  btnComprar.disabled = true;
  if (comprarError) comprarError.hidden = true;

  try {
    const res = await fetch('https://api.crochetin.com.br/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, color: selectedColor }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (data.init_point) {
      window.location.href = data.init_point;
    } else {
      throw new Error('sem init_point');
    }
  } catch {
    if (comprarError) comprarError.hidden = false;
    btnComprar.textContent = '🛒 Comprar agora';
    btnComprar.disabled = false;
  }
});
```

- [ ] **Step 4: Verificar TypeScript e build**

```bash
npx astro check && npx astro build
```

Esperado: zero erros.

- [ ] **Step 5: Verificar comportamento de erro gracioso**

```bash
npx astro dev
```

Abrir `http://localhost:4321/catalogo/bag-mari`:
1. Clicar "Comprar agora" sem cor → mensagem "Selecione uma cor" aparece.
2. Selecionar cor → clicar → botão muda para "⏳ Aguarde..." → após falha da API (esperada, API não existe ainda) → mensagem de erro aparece e botão volta ao normal.

- [ ] **Step 6: Commit**

```bash
git add src/pages/catalogo/[slug].astro
git commit -m "feat: add Comprar agora button with checkout flow and error handling"
```

---

### Task 8: Página /obrigada

**Files:**
- Create: `src/pages/obrigada.astro`

- [ ] **Step 1: Criar o arquivo**

Criar `src/pages/obrigada.astro`. Inspecionar `src/pages/catalogo/[slug].astro` ou outra página existente para identificar o nome do componente de layout correto (provavelmente `BaseLayout`).

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout
  title="Pedido confirmado — Crochetin"
  description="Obrigada pela sua compra! Sua bolsa artesanal está a caminho."
>
  <script is:inline>
    if (typeof fbq === 'function') {
      fbq('track', 'Purchase', { value: 0, currency: 'BRL' });
    }
  </script>

  <main class="obrigada-main">
    <div class="obrigada-icon">✅</div>
    <h1 class="obrigada-titulo">Pagamento confirmado!</h1>
    <p class="obrigada-texto">
      Obrigada pela sua compra! Em breve você receberá os detalhes por mensagem.
    </p>
    <p class="obrigada-contato">
      Dúvidas? Fale no <a href="https://wa.me/558296927755">WhatsApp</a>
    </p>
    <a href="/catalogo" class="obrigada-link">Ver mais bolsas →</a>
  </main>
</BaseLayout>

<style>
  .obrigada-main {
    text-align: center;
    padding: 4rem 2rem;
    max-width: 600px;
    margin: 0 auto;
  }

  .obrigada-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .obrigada-titulo {
    font-family: 'Playfair Display', serif;
    font-size: 2rem;
    color: #2d2d2d;
    margin-bottom: 1rem;
  }

  .obrigada-texto {
    color: #555;
    margin-bottom: 0.5rem;
  }

  .obrigada-contato {
    color: #888;
    font-size: 0.9rem;
    margin-bottom: 2rem;
  }

  .obrigada-contato a {
    color: #be996f;
    text-decoration: underline;
  }

  .obrigada-link {
    display: inline-block;
    padding: 10px 24px;
    border: 1px solid #be996f;
    color: #be996f;
    border-radius: 6px;
    font-size: 0.9rem;
    text-decoration: none;
    transition: background 0.2s;
  }

  .obrigada-link:hover {
    background: #be996f;
    color: #fff;
  }
</style>
```

**Nota sobre o layout:** Se o componente se chamar diferente de `BaseLayout` (verificar importações nas outras páginas), ajustar o import. Os props `title` e `description` devem corresponder ao que o layout aceita.

- [ ] **Step 2: Verificar TypeScript e build**

```bash
npx astro check && npx astro build
```

Esperado: zero erros. A página `/obrigada` deve aparecer em `docs/obrigada/index.html`.

- [ ] **Step 3: Verificar visualmente**

```bash
npx astro dev
```

Abrir `http://localhost:4321/obrigada` → confirmar layout correto e presença do script do Pixel.

- [ ] **Step 4: Commit**

```bash
git add src/pages/obrigada.astro
git commit -m "feat: add /obrigada page with Purchase pixel event"
```

---

## Parte 2 — crochetin-api (Fastify)

> Este repo é independente. Criar em um diretório irmão de `crochetin-linktree`.

---

### Task 9: Inicializar projeto crochetin-api

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Criar o diretório e inicializar**

```bash
cd ..   # sair de crochetin-linktree
mkdir crochetin-api && cd crochetin-api
git init
npm init -y
```

- [ ] **Step 2: Instalar dependências**

```bash
npm install fastify @fastify/cors mercadopago dotenv
npm install -D typescript @types/node tsx vitest
```

- [ ] **Step 3: Criar tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Atualizar package.json com scripts**

Editar `package.json` e adicionar:

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 5: Criar .env.example**

```env
MP_ACCESS_TOKEN=TEST-xxxx-substitua-pelo-token-sandbox
API_BASE_URL=https://api.crochetin.com.br
PORT=3333
```

- [ ] **Step 6: Criar .gitignore**

```
node_modules/
dist/
.env
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: initialize crochetin-api project"
```

---

### Task 10: Catálogo de produtos

**Files:**
- Create: `src/products.ts`

- [ ] **Step 1: Criar src/products.ts**

```ts
export interface Product {
  title: string;
  price: number;
  image: string;
  description: string;
  colors: string[];
}

export const products: Record<string, Product> = {
  'bag-mari': {
    title: 'Bag Mari',
    price: 279.90,
    image: 'https://crochetin.com.br/assets/bag-mari-nude.webp',
    description: 'Bolsa artesanal em Fio Náutico Premium',
    colors: ['nude', 'preta', 'cobre', 'verdemilitar', 'dourada'],
  },
  'bag-ariel': {
    title: 'Bag Ariel',
    price: 149.90,
    image: 'https://crochetin.com.br/assets/bag-ariel-areia.webp',
    description: 'Bolsa artesanal em Fio de Malha',
    colors: ['areia', 'caramelo', 'nude', 'offwhite', 'pink', 'preta', 'verdemilitar'],
  },
  'bag-atena': {
    title: 'Bag Atena',
    price: 259.90,
    image: 'https://crochetin.com.br/assets/bag-atena-nude.webp',
    description: 'Bolsa artesanal em Fio Náutico Premium',
    colors: ['nude', 'cobre', 'dourada', 'preta', 'verdemilitar', 'vermelha'],
  },
  'bag-lieta': {
    title: 'Bag Lieta',
    price: 279.90,
    image: 'https://crochetin.com.br/assets/bag-lieta-areia.webp',
    description: 'Bolsa artesanal em Fio de Malha Premium',
    colors: ['areia', 'nude', 'caramelo', 'offwhite', 'pink', 'preta', 'verdemilitar'],
  },
  'bag-cherry': {
    title: 'Bag Cherry',
    price: 299.90,
    image: 'https://crochetin.com.br/assets/bag-cherry-nude.webp',
    description: 'Bolsa artesanal em Fio Náutico Premium',
    colors: ['nude', 'preta', 'cobre', 'dourado'],
  },
};
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 3: Commit**

```bash
git add src/products.ts
git commit -m "feat: add products catalog"
```

---

### Task 11: Rota de checkout + testes

**Files:**
- Create: `src/routes/checkout.ts`
- Create: `src/routes/checkout.test.ts`
- Create: `src/app.ts`

- [ ] **Step 1: Criar src/app.ts (factory testável)**

```ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { checkoutRoutes } from './routes/checkout.js';

export async function buildApp() {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: ['https://crochetin.com.br', 'http://localhost:4321'],
  });

  await app.register(checkoutRoutes);

  return app;
}
```

- [ ] **Step 2: Escrever o teste antes da implementação**

Criar `src/routes/checkout.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../app.js';

vi.mock('mercadopago', () => ({
  MercadoPagoConfig: vi.fn(),
  Preference: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue({
      init_point: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=test-123',
    }),
  })),
}));

describe('POST /checkout', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp();
  });

  it('retorna init_point para produto válido', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/checkout',
      payload: { slug: 'bag-mari', color: 'nude' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.init_point).toMatch(/mercadopago/);
  });

  it('retorna init_point sem cor para produto sem cores', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/checkout',
      payload: { slug: 'bag-mari' },
    });

    expect(res.statusCode).toBe(200);
  });

  it('retorna 404 para produto inexistente', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/checkout',
      payload: { slug: 'bag-inexistente' },
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Produto não encontrado');
  });

  it('retorna 200 no webhook', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/webhook',
      payload: { type: 'payment', data: { id: '123' } },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).ok).toBe(true);
  });
});
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

```bash
npm test
```

Esperado: FAIL — `src/routes/checkout.ts` não existe ainda.

- [ ] **Step 4: Implementar src/routes/checkout.ts**

```ts
import { FastifyInstance } from 'fastify';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { products } from '../products.js';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export async function checkoutRoutes(app: FastifyInstance) {
  app.post<{ Body: { slug: string; color?: string } }>(
    '/checkout',
    async (req, reply) => {
      const { slug, color } = req.body;
      const product = products[slug];

      if (!product) {
        return reply.status(404).send({ error: 'Produto não encontrado' });
      }

      const preference = new Preference(client);
      const result = await preference.create({
        body: {
          items: [
            {
              id: slug,
              title: color ? `${product.title} - Cor: ${color}` : product.title,
              description: product.description,
              picture_url: product.image,
              quantity: 1,
              unit_price: product.price,
              currency_id: 'BRL',
            },
          ],
          back_urls: {
            success: 'https://crochetin.com.br/obrigada',
            failure: 'https://crochetin.com.br/catalogo',
            pending: 'https://crochetin.com.br/catalogo',
          },
          auto_return: 'approved',
          notification_url: `${process.env.API_BASE_URL}/webhook`,
          statement_descriptor: 'CROCHETIN',
        },
      });

      return reply.send({ init_point: result.init_point });
    }
  );

  app.post('/webhook', async (req, reply) => {
    console.log('MP Webhook:', JSON.stringify(req.body));
    return reply.send({ ok: true });
  });
}
```

- [ ] **Step 5: Rodar testes e confirmar que passam**

```bash
npm test
```

Esperado: 4 testes PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app.ts src/routes/checkout.ts src/routes/checkout.test.ts
git commit -m "feat: add checkout route with Mercado Pago integration and tests"
```

---

### Task 12: Server + Dockerfile

**Files:**
- Create: `src/server.ts`
- Create: `Dockerfile`

- [ ] **Step 1: Criar src/server.ts**

```ts
import 'dotenv/config';
import { buildApp } from './app.js';

const port = Number(process.env.PORT ?? 3333);

const app = await buildApp();

try {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`crochetin-api listening on port ${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
```

- [ ] **Step 2: Testar localmente com token sandbox**

Criar `.env` (não commitar):

```env
MP_ACCESS_TOKEN=TEST-xxxx  # substituir pelo token sandbox real quando disponível
API_BASE_URL=http://localhost:3333
PORT=3333
```

```bash
npm run dev
```

Esperado: `crochetin-api listening on port 3333`

Testar endpoint com curl (apenas valida que a rota responde — vai falhar no MP sem token real):
```bash
curl -X POST http://localhost:3333/checkout \
  -H "Content-Type: application/json" \
  -d '{"slug":"bag-inexistente"}'
```
Esperado: `{"error":"Produto não encontrado"}` com status 404.

- [ ] **Step 3: Criar Dockerfile**

```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx tsc

EXPOSE 3333
CMD ["node", "dist/server.js"]
```

- [ ] **Step 4: Verificar build TypeScript completo**

```bash
npx tsc
```

Esperado: zero erros, arquivos em `dist/`.

- [ ] **Step 5: Commit final**

```bash
git add src/server.ts Dockerfile
git commit -m "feat: add server entrypoint and Dockerfile for VPS deploy"
```

---

## Checklist de Pré-requisitos Externos (paralelo — não bloqueia o código)

- [ ] Criar conta em mercadopago.com.br/developers → copiar token sandbox (`TEST-...`)
- [ ] Meta Business Manager → confirmar Pixel ID → substituir `PIXEL_ID_PLACEHOLDER` em `BaseLayout.astro`
- [ ] Painel Hostinger DNS → adicionar registro A: `api` → IP do VPS
- [ ] Quando os 3 itens acima estiverem prontos: deploy da API no VPS + Nginx + SSL

---

## Critérios de Conclusão

- [ ] `npx astro check` e `npx astro build` passam sem erros
- [ ] Seletor de cor aparece em todas as páginas de produto com cores
- [ ] Botão "Comprar agora" exibe erro gracioso (API não está no ar ainda)
- [ ] `/obrigada` renderiza corretamente com script do Pixel
- [ ] `/aulas-avulsas` mostra Bag Tati e Bag Emy sem hardcode
- [ ] `/catalogo` não mostra Bag Tati nem Bag Emy
- [ ] `npm test` na crochetin-api passa com 4 testes
- [ ] Fontes carregam sem requisição para fonts.googleapis.com
- [ ] JSON-LD presente em todas as páginas de produto (verificar em DevTools)
