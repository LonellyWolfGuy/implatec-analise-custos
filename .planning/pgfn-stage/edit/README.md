# Radar Fiscal — Fornecedores

Aplicação independente para cadastrar fornecedores, manter o histórico de evidências fiscais e priorizar riscos de continuidade. O projeto não altera nem compartilha tabelas com o sistema de análise de custos.

## O que já funciona

- Cadastro individual e importação CSV de até 1.000 fornecedores.
- Validação dos dígitos verificadores do CNPJ.
- Histórico de consultas sem sobrescrever evidências anteriores.
- Registro de situação cadastral, CND federal, Dívida Ativa, FGTS, CNDT e informação de bureau autorizado.
- Score transparente de 0 a 100 e níveis Regular, Atenção, Alto e Crítico.
- Dashboard e busca por CNPJ ou razão social.
- Banco Supabase com RLS ativo e acesso somente pelo backend.

## Preparação

1. Crie um projeto no Supabase.
2. Execute `sql/schema.sql` no SQL Editor.
3. Copie `.env.example` para `.env` e preencha a URL e a chave `service_role`.
4. Instale e execute:

```powershell
npm install
npm run dev
```

Abra `http://localhost:3100`.

## CSV

Use UTF-8, separado por vírgula ou ponto e vírgula. Campos obrigatórios: `cnpj` e `razao_social`. Campos opcionais: `nome_fantasia` e `categoria`. Veja `exemplo-fornecedores.csv`.

## Critério inicial de risco

O score é uma triagem configurável, não um parecer contábil ou jurídico:

- CNPJ diferente de ativo: +100
- CND positiva: +45
- CND positiva com efeito de negativa: +15
- Dívida ativa: +35
- FGTS irregular: +25
- CNDT positiva: +20
- Negativação em bureau contratado: +30

O resultado é limitado a 100. Faixas: 0–14 Regular, 15–39 Atenção, 40–69 Alto e 70–100 Crítico.

## Consultas automáticas

A interface começa com registro manual para funcionar sem contratos externos. A automação deve ser implementada no backend, preservando em `evidencias` o protocolo, data, validade e resposta minimizada:

- CNPJ e CND: APIs oficiais Receita/Serpro.
- Dívida Ativa: dados abertos/lista de devedores da PGFN ou produto autorizado.
- FGTS: certificado de regularidade da Caixa.
- CNDT: serviço do Tribunal Superior do Trabalho.
- Negativação: Serasa, Boa Vista ou outro bureau, mediante contrato, finalidade legítima e controles de acesso.

Não automatize páginas com CAPTCHA nem armazene senhas Gov.br. Consultas detalhadas protegidas do contribuinte exigem autorização ou procuração. A aplicação deve operar com autenticação interna, trilha de auditoria, retenção definida e revisão de LGPD antes do uso produtivo.

## Produção

Configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` como segredos na Vercel. Antes de disponibilizar a terceiros, acrescente autenticação (Supabase Auth/SSO) às funções de API; a chave `service_role` nunca deve chegar ao navegador.
