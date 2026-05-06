# Design: Crochetin — Abordagem Frontend-First para Checkout

**Data:** 2026-05-06
**Abordagem escolhida:** B — Frontend primeiro
**Repositório frontend:** `crochetin-linktree` (Astro 5.x, GitHub Pages)
**Repositório API:** `crochetin-api` (Fastify, VPS Hostinger) — repo separado, a criar

---

## Contexto

O site crochetin.com.br tem tráfego mas não converte. O checkout atual é via WhatsApp (manual, fora do horário comercial). A meta é implementar checkout via Mercado Pago.

**Pré-requisitos externos ainda pendentes (dona faz em paralelo):**
- Criar conta Mercado Pago e obter token de acesso sandbox
- Verificar Pixel ID no Meta Business Manager
- Configurar registro DNS `api` → IP do VPS Hostinger

**Pré-requisitos técnicos já disponíveis:**
- VPS Hostinger com Docker instalado e Evolution API rodando
- Nginx não configurado ainda

**Decisão:** Não bloquear o código nos pré-requisitos externos. Construir o frontend completo agora; a API fica scaffoldada localmente pronta para deploy quando as credenciais chegarem.

---

## Arquitetura

```
[Astro - GitHub Pages - crochetin.com.br]
        |
        | POST /checkout { slug, color }
        v
[Fastify - VPS Hostinger - api.crochetin.com.br]   ← a criar
        |
        | Preference.create()
        v
[Mercado Pago API]
        |
        | init_point URL
        v
[Checkout MP - Pix / Cartão / Boleto]
        |
        | back_url: success
        v
[crochetin.com.br/obrigada]  ← fbq('track', 'Purchase')
```

Durante a Fase 1, o frontend aponta para `https://api.crochetin.com.br/checkout` que ainda não existe — o botão retornará erro graciosamente até a API subir.

---

## Fase 1A — Quick Wins (sem dependências externas)

### 1.1 Bug: category.replace → replaceAll
**Arquivo:** `src/pages/catalogo/[slug].astro:193`
```ts
// antes
product.category.replace('-', ' ')
// depois
product.category.replaceAll('-', ' ')
```

### 1.2 Self-host de fontes
**Instalar:** `@fontsource/outfit` + `@fontsource/playfair-display`
**Remover:** as 3 `<link>` do Google Fonts CDN em `src/layouts/BaseLayout.astro`
**Importar:** em `BaseLayout.astro` ou no CSS global:
```ts
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/600.css";
import "@fontsource/playfair-display/600.css";
```
**Motivo:** fontes CDN externo afetam LCP em conexões lentas (público mobile predominante).

### 1.3 JSON-LD Product schema
**Arquivo:** `src/pages/catalogo/[slug].astro` — adicionar no `<head>`:
```astro
<script type="application/ld+json" set:html={JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Product",
  "name": product.name,
  "image": [ogImageUrl],
  "description": product.description,
  "brand": { "@type": "Brand", "name": "Crochetin" },
  "offers": {
    "@type": "Offer",
    "price": product.price,
    "priceCurrency": "BRL",
    "availability": "https://schema.org/InStock",
    "url": `https://crochetin.com.br/catalogo/${slug}`
  }
})} />
```
**Motivo:** sem isso, produtos não aparecem como rich results no Google Shopping.

### 1.4 Bag Tati + Bag Emy no products.json
**Problema atual:** hardcoded em `src/pages/aulas-avulsas/index.astro` com URLs Hotmart diretas. Manutenção difícil.
**Solução:** adicionar entradas em `src/data/products.json`:
```json
{
  "slug": "bag-tati",
  "name": "Bag Tati",
  "lessonUrl": "https://pay.hotmart.com/M103664998T?bid=1767571051716",
  "inStock": false,
  "featured": false,
  "colors": []
}
```
A lógica em `aulas-avulsas/index.astro` já lê `lessonUrl` do JSON dinamicamente — o hardcode some ao adicionar os slugs ao array `lessonProductSlugs`.

### 1.5 Meta Pixel
**Arquivo:** `src/layouts/BaseLayout.astro` — adicionar antes de `</head>`:
```html
<script>
  const PIXEL_ID = 'PIXEL_ID_PLACEHOLDER';
  !function(f,b,e,v,n,t,s){...} // snippet padrão Meta
  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');
</script>
```
O `PIXEL_ID` fica como constante no topo — fácil substituir quando confirmado no Business Manager.

---

## Fase 1B — Checkout Frontend

### 2.1 Seletor de cor em [slug].astro
**Design aprovado:** bolinhas coloridas (opção A).

Renderizado condicionalmente (só aparece se `product.colors.length > 0`):
```astro
---
// Mapa de hex por slug de cor (strings usadas no products.json)
const colorHex: Record<string, string> = {
  nude: '#d4b896',
  preta: '#1a1a1a',
  cobre: '#b87333',
  dourada: '#d4af37',
  areia: '#c4a882',
  caramelo: '#c68642',
  offwhite: '#f5f0e8',
  pink: '#f4a0b5',
  verdemilitar: '#4a5e3a',
  vermelha: '#c0392b',
};
---

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
        />
      ))}
    </div>
    <p id="color-error" class="color-error" hidden>
      Selecione uma cor antes de continuar
    </p>
  </div>
)}
```

O mapa `colorHex` vive no frontmatter de `[slug].astro` — sem dependência de CSS variables ou arquivo externo. Cores desconhecidas fazem fallback para `#ccc`.

### 2.2 Botão e lógica de compra
**Estados do botão:**
1. Sem cor → exibe mensagem de erro inline (não `alert()`)
2. Com cor selecionada → habilitado normalmente
3. Aguardando API → `disabled`, texto "⏳ Aguarde..."
4. Erro → botão reabilitado, mensagem de erro inline abaixo

**Script client-side:**
```ts
document.getElementById("btn-comprar")?.addEventListener("click", async () => {
  // valida cor → desabilita botão → POST para API → redireciona
  // em caso de erro: reabilita botão + exibe erro inline
});
```

Endpoint: `https://api.crochetin.com.br/checkout`
Payload: `{ slug: string, color?: string }`
Resposta esperada: `{ init_point: string }`

### 2.3 Página /obrigada.astro
**Arquivo a criar:** `src/pages/obrigada.astro`

Conteúdo: ✅ + título "Pagamento confirmado!" + texto de agradecimento + link WhatsApp + link "Ver mais bolsas".

**Pixel:** `fbq('track', 'Purchase', { value: product.price, currency: 'BRL' })` no `<head>` desta página.

**Nota:** o `value` do evento Purchase será 0 inicialmente (sem contexto de qual produto foi comprado nesta fase). Fase 2 pode passar o valor via query param da `back_url`.

---

## Fase 1C — Scaffolding da API (repo separado)

**Repo:** `crochetin-api` (criar fora do `crochetin-linktree`)

### Stack
- Fastify + `@fastify/cors`
- `mercadopago` SDK oficial
- TypeScript com `NodeNext`
- `dotenv` para credenciais

### Estrutura
```
crochetin-api/
  src/
    products.ts        ← espelho dos produtos do products.json
    routes/
      checkout.ts      ← POST /checkout + POST /webhook (stub)
    server.ts          ← Fastify + CORS + listen
  .env                 ← MP_ACCESS_TOKEN, API_BASE_URL
  Dockerfile           ← node:20-alpine, expõe 3333
  tsconfig.json
  package.json
```

### CORS
Origens permitidas: `https://crochetin.com.br` + `http://localhost:4321`

### Webhook
Por ora apenas loga o body. Fase 2: disparar notificação WhatsApp via Evolution API já instalada no VPS.

### Deploy (quando DNS + MP estiverem prontos)
1. `docker build` no VPS
2. Nginx como reverse proxy para `localhost:3333`
3. `certbot --nginx -d api.crochetin.com.br`

---

## Trilha 2 — Checklist para a dona (paralelo ao código)

- [ ] Criar conta Mercado Pago em mercadopago.com.br/developers
- [ ] Copiar token sandbox (`TEST-...`) para o `.env` da API
- [ ] Verificar Pixel ID no Meta Business Manager → substituir `PIXEL_ID_PLACEHOLDER`
- [ ] Painel Hostinger DNS: adicionar registro A `api` → IP do VPS
- [ ] Quando os 3 itens acima estiverem prontos: avisar para iniciar deploy

---

## O que fica fora do escopo desta fase

- Estoque real / controle de quantidade
- Histórico de pedidos (banco de dados)
- Notificação WhatsApp automática pós-compra (Evolution API — Fase 2)
- Centralizar aulas avulsas no domínio próprio
- Parcelamento dinâmico (lido do JSON + cálculo de taxa)
- Cross-sell na página de produto

---

## Critérios de sucesso

- [ ] Todas as páginas de produto têm seletor de cor funcional
- [ ] Botão "Comprar agora" valida cor e redireciona para MP (em sandbox)
- [ ] `/obrigada` dispara evento `Purchase` no Pixel
- [ ] JSON-LD válido em todas as páginas de produto (testável no Rich Results Test do Google)
- [ ] Fontes carregadas localmente (sem requisição para fonts.googleapis.com)
- [ ] Bag Tati e Bag Emy funcionando via JSON (sem hardcode)
- [ ] Bug `category.replaceAll` corrigido
- [ ] Build do GitHub Actions passando (sem regressão)
