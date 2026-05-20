# Roadmap: Implatec - Análise de Custos

**5 phases** | **9 requirements mapped** | All v1 requirements covered ✓

## Phase 1: Limpeza e Infraestrutura

**Goal:** Limpar artefatos de desenvolvimento, remover código morto, configurar git e documentação básica.

**Requirements:** INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05

**Success Criteria:**
1. Código morto removido (Supabase não usado, App.css boilerplate, README genérico substituído)
2. Artefatos de dev limpos (test_pdfjs.mjs, parse_test.py removidos ou movidos)
3. index.html com título "Implatec - Análise de Custos"
4. .env.example criado com variáveis documentadas
5. .gitignore configurado e commit inicial do código existente

**Depends on:** Nenhuma

**UI hint:** Não

## Phase 2: Refinar Parser de PDF

**Goal:** Melhorar o mapeamento de categorias com regras de negócio reais da Implatec.

**Requirements:** REF-01

**Success Criteria:**
1. Função `guessCategory` atualizada com mapeamento completo baseado em códigos e descrições reais
2. Categorias corretas para todos os itens dos PDFs de exemplo (MOD7 Abril/Maio)
3. Items sem categoria identificados para revisão manual

**Depends on:** Phase 1

**UI hint:** Não

## Phase 3: Métricas no Dashboard

**Goal:** Adicionar cards de métricas resumidas no Dashboard React (totais, variações, novos/removidos).

**Requirements:** DASH-01

**Success Criteria:**
1. Cards exibindo: total de itens, valor total Mês 1, valor total Mês 2, delta total
2. Cards exibindo: itens com aumento de custo, itens com redução, itens novos, itens removidos
3. Cards com cores indicativas (verde/vermelho) para deltas positivos/negativos
4. Layout responsivo dos cards acima da tabela

**Depends on:** Phase 1

**UI hint:** Sim

## Phase 4: Filtros Avançados

**Goal:** Adicionar filtros de categoria e tipo de variação no Dashboard React.

**Requirements:** DASH-02

**Success Criteria:**
1. Filtro por categoria (PA, CO, MP, EM, AG, RE + "Todas")
2. Filtro por tipo de variação (todos, só alterados, só novos, só removidos)
3. Filtros funcionam em conjunto com a busca por texto já existente

**Depends on:** Phase 3

**UI hint:** Sim

## Phase 5: Seletor de Mês

**Goal:** Substituir a ordenação alfabética por um seletor visual de Mês 1 e Mês 2.

**Requirements:** REF-02

**Success Criteria:**
1. Seletor visual para definir qual arquivo é Mês 1 e qual é Mês 2
2. Labels claras ("Mês 1 — Referência", "Mês 2 — Comparado")
3. Comportamento de fallback se apenas um arquivo for carregado

**Depends on:** Phase 1

**UI hint:** Sim

---

## Commit Order

Fases com dependências:
- Phase 1 (independente) → executa primeiro
- Phase 2 (depends on 1), Phase 3 (depends on 1), Phase 5 (depends on 1) → executam após Phase 1
- Phase 4 (depends on 3) → executa após Phase 3
