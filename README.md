# Implatec — Análise de Custos

Comparativo de inventário entre dois meses para a Implatec Perfis Plásticos. Processa relatórios PDF (MOD7) e CSV exportados do TOTVS ERP, cruza dados por código de item e exibe um dashboard interativo com métricas, filtros e variações de custo.

**Desenvolvedor:** Thiago Fischer
**Empresa:** Implatec Perfis Plásticos — CNPJ 00.716.481/0001-36
**Modelo:** P7 (Custo Médio)

---

## Funcionalidades

- **Upload de arquivos** — Arraste ou clique para enviar PDFs (MOD7) ou CSVs
- **Parsing automático** — Extrai linhas pipe-delimitadas do relatório TOTVS e infere categorias por prefixo do código
- **Seletor de períodos** — Define qual arquivo corresponde a Mês 1 (referência) e Mês 2 (comparado)
- **Dashboard interativo**:
  - Cards de métricas: total de itens, valores por mês, delta, itens com custo subiu/baixou, novos/removidos
  - Resumo consolidado por categoria (PA, CO, MP, EM, AG, RE)
  - Tabela com 15 colunas: código, descrição, categoria, qtd, unitário, parcial e deltas (R$ e %)
  - Filtros: visualização (todos/alterados), categoria, variação de custo, busca textual
  - Ordenação por qualquer coluna
  - Paginação (25 itens por página)
- **Salvar & Compartilhar** — Salva a análise no Supabase e gera um link compartilhável
- **Tema claro/escuro** — Alternância com persistência em localStorage

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML5, CSS3 (custom properties), JavaScript (vanilla) |
| PDF | pdf.js (cdnjs) |
| CSV | PapaParse (cdnjs) |
| API | Vercel Serverless Functions (Node.js) |
| Banco | Supabase (PostgreSQL) |
| Hospedagem | Vercel |

## Estrutura do Projeto

```
├── index.html              # Aplicação SPA completa (frontend)
├── api/
│   ├── save.js             # POST — salva análise no Supabase
│   └── load.js             # GET  — carrega análise por ID
├── package.json            # Dependências Node.js (API)
├── sql-criar-tabela.sql    # Script para criar a tabela no Supabase
├── .env.example            # Template de variáveis de ambiente
├── .gitignore
└── README.md
```

## Como Executar Localmente

### Pré-requisitos

- Node.js 18+
- Uma instância do Supabase (gratuita em supabase.com)

### Setup

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com as credenciais do seu Supabase:
#   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
#   VITE_SUPABASE_ANON_KEY=suachaveanon

# 3. Criar a tabela no Supabase
# Execute o conteúdo de sql-criar-tabela.sql no SQL Editor do Supabase

# 4. Rodar localmente com Vercel CLI
npx vercel dev
```

Acesse `http://localhost:3000`.

> Também funciona abrindo `index.html` diretamente no navegador (modo estático, sem API).

## Deploy na Vercel

1. Faça push do repositório para o GitHub
2. Acesse [vercel.com/new](https://vercel.com/new) e importe o repositório
3. Adicione as variáveis de ambiente:

| Nome | Valor |
|------|-------|
| `VITE_SUPABASE_URL` | URL do seu projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima do Supabase |

4. Clique em **Deploy**

## Uso

1. Abra o link do Vercel
2. Faça upload de dois arquivos de inventário (PDF ou CSV)
3. Selecione qual arquivo corresponde a cada mês
4. Analise o dashboard com métricas, filtros e tabela comparativa
5. Clique em **Salvar** para gerar um link compartilhável

## Formato do PDF (MOD7 — TOTVS)

O parser espera linhas no formato pipe-delimitado extraídas do relatório MOD7:

```
| CÓDIGO | DESCRIÇÃO | UND | QUANTIDADE | UNITÁRIO | PARCIAL |
```

As categorias são inferidas pelo prefixo do código:

| Prefixo | Categoria |
|---------|-----------|
| `01` | PA — Produto Acabado |
| `03` | CO — Composto |
| `04` | MP — Matéria Prima |
| `05` | AG — Agregado |
| `06` | EM — Embalagem |
| `11` | RE — Refugo |

## Licença

Uso interno — Implatec Perfis Plásticos.
