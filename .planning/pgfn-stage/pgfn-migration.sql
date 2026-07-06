create table if not exists public.pgfn_consultas (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  referencia text not null,
  encontrado boolean not null default false,
  irregular boolean not null default false,
  quantidade_inscricoes integer not null default 0,
  valor_total numeric(18,2) not null default 0,
  valor_irregular numeric(18,2) not null default 0,
  valor_regularizado numeric(18,2) not null default 0,
  tipos_divida jsonb not null default '[]'::jsonb,
  situacoes jsonb not null default '[]'::jsonb,
  fontes jsonb not null default '[]'::jsonb,
  consultado_em timestamptz not null default now(),
  unique (fornecedor_id, referencia)
);

create index if not exists pgfn_fornecedor_data_idx on public.pgfn_consultas(fornecedor_id, consultado_em desc);
alter table public.pgfn_consultas enable row level security;

comment on table public.pgfn_consultas is 'Cruzamento com dados abertos trimestrais da PGFN. Ausência não equivale a CND negativa.';
