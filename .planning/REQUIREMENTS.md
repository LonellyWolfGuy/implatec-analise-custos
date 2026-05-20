# Requirements: Implatec - Análise de Custos

**Defined:** 2026-05-20
**Core Value:** Comparar inventário de dois meses de forma rápida e confiável, destacando variações de custo

## v1 Requirements

### Refinamento Parser

- [ ] **REF-01**: Regras de categorização ajustadas conforme regras de negócio reais da Implatec
- [ ] **REF-02**: Seletor de mês implementado para definir Mês 1 e Mês 2 manualmente

### Dashboard

- [ ] **DASH-01**: Dashboard React com cards de métricas (totais, aumento/redução, novos/removidos)
- [ ] **DASH-02**: Filtros por categoria e tipo de variação implementados

### Limpeza e Infra

- [ ] **INFRA-01**: Código morto removido (Supabase não usado, App.css boilerplate, README genérico)
- [ ] **INFRA-02**: Artefatos de desenvolvimento limpos (test scripts, parse_test.py)
- [ ] **INFRA-03**: index.html com título descritivo e documentação básica de uso
- [ ] **INFRA-04**: .env.example criado com variáveis de ambiente documentadas
- [ ] **INFRA-05**: Repositório git inicializado com .gitignore e commit inicial

## v2 Requirements

- **MODO-01**: Modo escuro/claro (já existe no HTML standalone)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend/API | App é front-end puro |
| Banco de dados | Supabase presente mas não integrado neste ciclo |
| Autenticação | Sem necessidade para versão atual |
| Testes automatizados | Diferido para ciclos futuros |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-05 | Phase 1 | Pending |
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| REF-01 | Phase 2 | Pending |
| DASH-01 | Phase 3 | Pending |
| DASH-02 | Phase 4 | Pending |
| REF-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-20*
*Last updated: 2026-05-20 after initial definition*
