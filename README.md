# Implatec — Análise de Custos

Comparativo de inventário mensal para a Implatec Perfis Plásticos. Processa relatórios PDF (MOD7) e CSV exportados do TOTVS ERP, cataloga os dados por mês no banco, e exibe um dashboard interativo comparando as oscilações de custo entre dois períodos selecionados.

**Desenvolvedor:** Thiago Fischer
**Empresa:** Implatec Perfis Plásticos — CNPJ 00.716.481/0001-36
**Modelo:** P7 (Custo Médio)

---

## Funcionalidades

- **Catálogo Mensal** — Faça upload de um PDF (MOD7) ou CSV para catalogar o inventário de um mês específico no banco de dados.
- **Parsing automático** — Extrai linhas pipe-delimitadas do relatório TOTVS e infere categorias por prefixo do código.
- **Comparativo Dinâmico** — Selecione dois meses do catálogo no banco para cruzar os dados.
- **Dashboard interativo**:
  - Cards de métricas: total de itens, valores por mês, delta, itens com custo subiu/baixou, novos/removidos
  - Resumo consolidado por categoria (PA, CO, MP, EM, AG, RE)
  - Tabela com 15 colunas: código, descrição, categoria, qtd, unitário, parcial e deltas (R$ e %)
  - Filtros: visualização (todos/alterados), categoria, variação de custo, busca textual
  - Ordenação por qualquer coluna
  - Paginação (25 itens por página)
- **Compartilhamento** — Gera um link compartilhável instantâneo da comparação gerada.
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
│   ├── save_inventory.js   # POST — salva inventário de um mês no Supabase
│   ├── list_inventories.js # GET  — lista os meses já catalogados
│   └── get_inventory.js    # GET  — carrega itens de um inventário específico
├── package.json            # Dependências Node.js (API)
├── sql-criar-tabela-mensal.sql # Script para criar a tabela no Supabase
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
# Execute o conteúdo de sql-criar-tabela-mensal.sql no SQL Editor do Supabase

# 4. Rodar localmente com Vercel CLI
npx vercel dev
```

Acesse `http://localhost:3000`.

> Para usar o catálogo e a comparação entre meses, execute o servidor local ou a Vercel. Abrir `index.html` diretamente no navegador não carrega as rotas `/api`.

## Deploy na Vercel

1. Faça push do repositório para o GitHub
2. Acesse [vercel.com/new](https://vercel.com/new) e importe o repositório
3. Adicione as variáveis de ambiente:

| Nome | Valor |
|------|-------|
| `VITE_SUPABASE_URL` | URL do seu projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role para sobrescrever/remover inventários pelo backend |

4. Clique em **Deploy**
5. O Vercel ativará automaticamente o Cron Job configurado no arquivo `vercel.json`, que acessa a rota `/api/keepalive` diariamente para evitar que o projeto no Supabase seja pausado por inatividade.

## Uso

1. Abra o link da aplicação.
2. Clique em **Catalogar Novo Mês**, escolha um arquivo PDF/CSV e informe o mês/ano de referência.
3. Após ter mais de um mês catalogado, vá em **Comparar Meses**.
4. Selecione os dois meses que deseja comparar e analise o dashboard com métricas, filtros e tabela.
5. Clique em **Compartilhar** para copiar um link direto para essa visualização.

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

## Segurança e auditoria

O arquivo `sql-seguranca-auditoria.sql` cria um histórico automático de inserções, substituições e exclusões. Execute-o uma vez no SQL Editor do Supabase. A tabela `inventory_audit` guarda a versão completa de cada inventário alterado.

As policies autenticadas estão preparadas no final do arquivo, mas comentadas para não interromper o uso atual. Ative-as somente depois de cadastrar os usuários no Supabase Auth e habilitar o login da aplicação.