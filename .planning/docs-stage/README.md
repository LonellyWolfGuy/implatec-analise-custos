# Radar Fiscal — Fornecedores

Plataforma interna para cadastrar fornecedores, cruzar CNPJs com dados abertos da PGFN, registrar certidões fiscais e priorizar riscos de continuidade e conformidade tributária.

Produção: https://fornecedor-compliance.vercel.app

> A análise é uma triagem gerencial. “Sem ocorrência na PGFN” não equivale a CND negativa nem substitui parecer fiscal, contábil ou jurídico.

## Funcionalidades

- Cadastro individual e importação CSV em lotes.
- Validação dos dígitos verificadores do CNPJ.
- Paginação acima de 1.000 fornecedores.
- Cruzamento trimestral com as bases abertas não previdenciária, previdenciária e FGTS da PGFN.
- Separação entre inscrições em cobrança e situações regularizadas, suspensas ou negociadas.
- Consolidação de quantidade, tipo e valor das inscrições encontradas.
- Link para emissão gratuita da CND no portal oficial da Receita Federal.
- Upload de CND em PDF com limite de 4 MB.
- Leitura automática de CNPJ, tipo, validade e código de controle da certidão.
- Bloqueio de PDF cujo CNPJ não corresponda ao fornecedor selecionado.
- Armazenamento privado no Supabase Storage.
- Visualização por URL assinada com validade de 60 segundos.
- Alertas de CND vencida ou com vencimento em até 30 dias.
- Histórico imutável de consultas e evidências.
- Score configurável de risco fiscal.

## Arquitetura

| Camada | Tecnologia |
|---|---|
| Frontend | HTML, CSS e JavaScript |
| API | Node.js / Vercel Functions |
| Banco e documentos | Supabase PostgreSQL e Storage |
| Processamento PGFN | Python / GitHub Actions |
| Extração de PDF | PDF.js instalado no backend |
| Deploy | GitHub + Vercel |

## Instalação local

1. Crie um projeto no Supabase.
2. Execute `sql/schema.sql` no SQL Editor.
3. Copie `.env.example` para `.env`.
4. Preencha:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
PORT=3100
```

5. Instale e execute:

```powershell
npm install
npm run check
npm run dev
```

Abra `http://localhost:3100`.

## Migrações

Para instalações existentes, execute no Supabase:

1. `sql/pgfn-migration.sql` — resultados das bases abertas da PGFN.
2. `sql/cnd-migration.sql` — bucket privado para documentos CND.

O arquivo `sql/schema.sql` já inclui a estrutura consolidada para instalações novas.

## Importação CSV

O arquivo deve estar em UTF-8, separado por vírgula ou ponto e vírgula.

Campos obrigatórios:

- `cnpj`
- `razao_social`

Campos opcionais:

- `nome_fantasia`
- `categoria`

Veja `exemplo-fornecedores.csv`.

## Dados abertos da PGFN

O workflow `.github/workflows/pgfn.yml` executa `scripts/sync_pgfn.py` trimestralmente e também permite execução manual.

No GitHub, configure em **Settings → Secrets and variables → Actions**:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Execução manual: **Actions → Atualizar dados abertos PGFN → Run workflow**.

A rotina:

1. Obtém os arquivos oficiais mais recentes.
2. Baixa os três ZIPs da PGFN.
3. Filtra apenas os CNPJs ativos cadastrados.
4. Consolida inscrições e valores.
5. Atualiza `pgfn_consultas` no Supabase.

Os arquivos completos não são adicionados ao GitHub nem armazenados pela aplicação.

## CND gratuita da Receita

Fluxo operacional:

1. Abra um fornecedor e clique em **Abrir consulta gratuita na Receita**.
2. Informe o CNPJ no portal oficial.
3. Baixe a certidão emitida.
4. Anexe o PDF na plataforma.
5. O backend valida e extrai os metadados.

O documento fica no bucket privado `cnd-documentos`. A chave `service_role` nunca é enviada ao navegador.

## Score de risco

- CNPJ diferente de ativo: +100
- CND positiva: +45
- CND positiva com efeito de negativa: +15
- Dívida ativa: +35
- FGTS irregular: +25
- CNDT positiva: +20
- Negativação em bureau autorizado: +30

O resultado é limitado a 100:

- 0–14: Regular
- 15–39: Atenção
- 40–69: Alto
- 70–100: Crítico

## Deploy

Na Vercel, configure para **Production**:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

A branch `main` é a branch de produção. Cada push gera um novo deploy automático.

## Segurança e limitações

- Não automatizar CAPTCHA nem armazenar credenciais Gov.br.
- Não expor a chave `service_role` no frontend ou GitHub.
- PDFs são privados e acessados somente por links temporários.
- A ausência de inscrição na PGFN não comprova regularidade fiscal.
- CND, FGTS, CNDT e informações de bureau possuem escopos diferentes.
- Antes de disponibilizar o sistema amplamente, adicionar autenticação interna, autorização por perfil, auditoria de acesso e política de retenção/LGPD.

## Comandos úteis

```powershell
npm run check
npm run dev
python scripts/sync_pgfn.py
```

Uso interno — Implatec Perfis Plásticos.
