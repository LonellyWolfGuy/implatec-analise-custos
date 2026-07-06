create extension if not exists pgcrypto;

create table if not exists public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  cnpj varchar(14) not null unique check (cnpj ~ '^[0-9]{14}$'),
  razao_social text not null,
  nome_fantasia text,
  categoria text,
  email_contato text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.consultas_fornecedores (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  origem text not null default 'MANUAL',
  situacao_cnpj text not null default 'NAO_CONSULTADO',
  cnd_federal text not null default 'NAO_CONSULTADO',
  divida_ativa boolean not null default false,
  valor_divida_ativa numeric(15,2) not null default 0,
  fgts text not null default 'NAO_CONSULTADO',
  cndt text not null default 'NAO_CONSULTADO',
  negativado boolean not null default false,
  score_risco integer not null check (score_risco between 0 and 100),
  nivel_risco text not null check (nivel_risco in ('REGULAR','ATENCAO','ALTO','CRITICO')),
  validade_cnd date,
  observacoes text,
  evidencias jsonb not null default '{}'::jsonb,
  consultado_em timestamptz not null default now()
);

create index if not exists consultas_fornecedor_data_idx on public.consultas_fornecedores(fornecedor_id, consultado_em desc);

alter table public.fornecedores enable row level security;
alter table public.consultas_fornecedores enable row level security;

-- O backend usa service role. Não crie policies públicas: informações fiscais
-- e de crédito devem ficar restritas a usuários internos autenticados.
