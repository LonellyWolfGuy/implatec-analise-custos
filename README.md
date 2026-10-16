# Implatec — Análise de Custos

Sistema comparativo de inventários mensais para a **Implatec Perfis Plásticos**. Processa relatórios PDF (MOD7) e CSV exportados do ERP TOTVS, armazena os dados catalogados por mês no Supabase, e exibe um dashboard interativo detalhado para identificação e auditoria de oscilações de custo médio.

**Criador e mantenedor:** Thiago Fischer  
**Empresa:** Implatec Perfis Plásticos — CNPJ 00.716.481/0001-36  
**Modelo de Custo:** P7 (Custo Médio)

---

## Funcionalidades

- **Catálogo Mensal & Ingestão com Drag-and-Drop:**
  - Upload de arquivos PDF (MOD7 TOTVS) ou CSV com suporte a múltiplos delimitadores (`,`, `;`, `\t`, `|`).
  - Extração inteligente de dados com normalização automática de cabeçalhos e tratamento de valores no padrão numérico brasileiro.
  - Diagnóstico imediato no upload (total de itens, códigos únicos, alertas de itens zerados ou duplicados).
  - Inferência automática do mês de referência a partir do nome do arquivo.
- **Comparativo Dinâmico de Custos:**
  - Cruzamento de inventários entre quaisquer dois períodos salvos no catálogo.
  - Cards de métricas com totais, flutuação financeira geral (R$ e %), contagem de altas, quedas, itens novos no mês comparado e itens zerados/descontinuados.
- **Filtros Avançados:**
  - Visualização: *Só Alterados*, *Todos os Itens*, *Só Aumentos de Custo*, *Só Reduções de Custo*, *Novos no Mês 2*, *Zerados / Descontinuados*.
  - Categorias industriais completas da Implatec: `PA` (Produto Acabado - 01), `CO` (Composto - 03), `MP` (Matéria Prima - 04), `AG` (Agregado - 05), `EM` (Embalagem - 06) e `RE` (Refugo - 11).
  - Busca textual em tempo real por código ou narrativa/descrição.
- **Tabela Interativa com Ordenação e Paginação:**
  - Ordenação clicável em **todas as 12 colunas** (ascendente e descendente), incluindo Código, Descrição, Qtds, Preços Unitários, Totais e Variações (Δ Unit, Δ Parc e Δ Parc %).
  - Paginação configurável (25, 50, 100 itens por página ou visão completa).
- **Exportação Dual (Relatórios Executivos e Operacionais):**
  - **Exportar PDF:** Relatório executivo em orientação paisagem com a identidade visual da Implatec (logo oficial, cores institucionais verde/vermelho, indicadores consolidados do recorte filtrado e paginação automática com rodapé de auditoria).
  - **Exportar CSV:** Planilha pronta para abertura direta no Microsoft Excel com encoding UTF-8 com BOM (`\uFEFF`), delimitador ponto-e-vírgula (`;`) e formatação decimal brasileira.
  - **Impressão Nativa:** Layout estilizado `@media print` para impressões rápidas do navegador.
- **Gerenciamento de Arquivos:**
  - Painel para listar e excluir inventários armazenados no banco.
- **Tema Claro / Escuro:**
  - Design moderno em glassmorphism com persistência no `localStorage`.

---

## Tech Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19, Vite 8, Lucide React, Chart.js, React-ChartJS-2 |
| Estilização | Vanilla CSS moderno com tokens HSL e suporte a Dark Mode |
| Geração de Relatórios | jsPDF, jspdf-autotable |
| Processamento de Arquivos | pdfjs-dist (Web Workers), PapaParse |
| API / Backend | Node.js (ESM), Vercel Serverless Functions |
| Banco de Dados | Supabase (PostgreSQL com JSONB otimizado e RLS) |
| Hospedagem | Vercel |

---

## Estrutura do Projeto

```
├── api/
│   ├── delete_inventory.js   # DELETE — remove inventário específico ou limpa banco
│   ├── get_inventory.js      # GET    — busca o inventário completo pelo ID
│   ├── keepalive.js          # GET    — ping periódico do cron job da Vercel
│   ├── list_inventories.js   # GET    — lista inventários salvos (otimizado com item_count)
│   └── save_inventory.js     # POST   — cataloga ou sobrescreve inventário no Supabase
├── src/
│   ├── assets/               # Logotipos e assets estáticos
│   ├── components/
│   │   ├── CompareDashboard.jsx  # Dashboard comparativo, tabela e exportadores (PDF/CSV)
│   │   ├── ManageInventories.jsx # Painel para gerenciar e excluir inventários
│   │   └── UploadModal.jsx       # Modal de upload com drag-and-drop e diagnóstico
│   ├── services/
│   │   ├── api.js            # Cliente HTTP com retries automáticos
│   │   └── parser.js         # Parsers de PDF (MOD7) e CSV com normalização
│   ├── App.jsx               # Estrutura principal da SPA
│   ├── index.css             # Design system completo e estilos globais
│   └── main.jsx              # Ponto de entrada React
├── sql-criar-tabela-mensal.sql   # Script DDL com coluna item_count e policies
├── sql-seguranca-auditoria.sql   # Triggers de auditoria e versionamento no Supabase
├── server.js                 # Servidor local Node.js para emular rotas serverless
├── vite.config.js            # Configuração do Vite com proxy reverso para /api
├── vercel.json               # Configurações de deploy e cron na Vercel
└── package.json
```

---

## Como Executar Localmente

### 1. Pré-requisitos
- Node.js 18+
- Projeto no Supabase (URL e chaves anônima / service role)

### 2. Configurar Variáveis de Ambiente
Copie o `.env.example` para `.env` e preencha suas credenciais:
```bash
cp .env.example .env
```

Exemplo:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
```

### 3. Configurar a Tabela no Supabase
Abra o **SQL Editor** do Supabase e execute o script:
- [`sql-criar-tabela-mensal.sql`](file:///e:/Projetos%20IA/implatec-an%C3%A1lisecustos/sql-criar-tabela-mensal.sql)

*(Opcional para auditoria)*: execute também [`sql-seguranca-auditoria.sql`](file:///e:/Projetos%20IA/implatec-an%C3%A1lisecustos/sql-seguranca-auditoria.sql).

### 4. Instalar Dependências e Iniciar
Para rodar tanto o servidor da API (porta 3000) quanto o servidor Vite (porta 5173) com um único comando:

```bash
npm install
npm run dev:all
```

Acesse a aplicação no navegador em:
👉 **`http://localhost:5173`**

*(Se preferir rodar em terminais separados: `npm run server` em um terminal e `npm run dev` no outro).*

---

## Deploy na Vercel

1. Envie o repositório para o GitHub:
   ```bash
   git add .
   git commit -m "feat: melhorias de performance, ordenacao, paginacao e exportacao csv"
   git push origin main
   ```
2. Na Vercel, importe o repositório.
3. Configure as variáveis de ambiente em **Settings > Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Clique em **Deploy**. O cron job em `vercel.json` manterá a instância do Supabase acordada automaticamente.

---

## Regras de Classificação TOTVS (Prefixos)

As categorias de produtos são identificadas automaticamente pelo código:

| Prefixo | Categoria | Descrição |
|---------|-----------|-----------|
| `01` | **PA** | Produto Acabado |
| `03` | **CO** | Composto |
| `04` | **MP** | Matéria Prima |
| `05` | **AG** | Agregado |
| `06` | **EM** | Embalagem |
| `11` | **RE** | Refugo |
| Outros | **??** | Não Classificado |

---

## Licença

Uso interno exclusivo — **Implatec Perfis Plásticos**.