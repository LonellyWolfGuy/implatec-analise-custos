# Implatec - Análise de Custos

## What This Is

Aplicação web para análise comparativa de custos de inventário da Implatec Perfis Plásticos. Processa relatórios PDF (MOD7) e CSV exportados do TOTVS ERP, cruza dados de dois meses e exibe um dashboard interativo com deltas de quantidade, custo unitário e custo total por item.

## Core Value

Comparar inventário de dois meses de forma rápida e confiável, destacando variações de custo para tomada de decisão.

## Requirements

### Validated

- ✓ Upload e parse de PDF (MOD7) via pdfjs-dist
- ✓ Upload e parse de CSV via PapaParse
- ✓ Cruzamento de dados de dois meses por código de item
- ✓ Dashboard com ordenação, filtros por categoria/busca, paginação (25 itens)
- ✓ Exportação do dashboard para PDF via html2pdf.js
- ✓ HTML standalone completo com dados reais (comparativo_inventario_abril_maio_2026.html)

### Active

- [ ] **REF-01**: Refinar parser de PDF com mapeamento de categorias baseado nas regras reais da Implatec
- [ ] **REF-02**: Adicionar seletor de mês (em vez de ordenação alfabética) para definir Mês 1 e Mês 2
- [ ] **DASH-01**: Adicionar cards de métricas resumidas (totais, itens com aumento/redução, novos/removidos)
- [ ] **DASH-02**: Implementar filtros de categoria e variação no Dashboard React
- [ ] **INFRA-01**: Remover código morto (Supabase não utilizado, App.css boilerplate, README genérico)
- [ ] **INFRA-02**: Limpar artefatos de desenvolvimento (test_pdfjs.mjs, parse_test.py, App.css não usado)
- [ ] **INFRA-03**: Atualizar index.html com título descritivo e instruções de uso
- [ ] **INFRA-04**: Criar .env.example e documentar variáveis de ambiente
- [ ] **INFRA-05**: Inicializar git com .gitignore adequado e commit inicial do código existente

### Out of Scope

- Backend/API — A aplicação é front-end puro, sem planos de backend por enquanto
- Armazenamento em banco de dados — Supabase está presente mas não será integrado neste ciclo
- Autenticação de usuários — Sem necessidade para versão atual
- Testes automatizados — Serão adicionados se necessário em ciclos futuros

## Context

- Empresa: Implatec Perfis Plásticos (indústria de perfis plásticos)
- ERP de origem: TOTVS (exporta relatórios MOD7)
- Stack atual: React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4
- O parser de PDF usa pdfjs-dist e regex para extrair linhas pipe-delimitadas
- Categorias inferidas heuristicamente: PA (Produto Acabado), CO (Componente), MP (Matéria Prima), EM (Embalagem), AG (Agregado), RE (Revestimento)

## Constraints

- **Tech Stack**: React + TypeScript + Vite + Tailwind CSS (mantido)
- **Parser PDF**: Dependente do formato específico do MOD7 do TOTVS
- **Ambiente**: Front-end estático, sem backend

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Front-end puro | Dados são arquivos locais (PDF/CSV), sem necessidade de servidor | ✓ Good |
| Tailwind CSS v4 | Estilização rápida e consistente | ✓ Good |
| pdfjs-dist para parser | Extração de texto de PDF no browser | ✓ Good |
| html2pdf.js para exportação | Geração de PDF do dashboard no cliente | ✓ Good |

---
*Last updated: 2026-05-20 after initialization*
