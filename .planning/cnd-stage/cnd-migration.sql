insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cnd-documentos', 'cnd-documentos', false, 4194304, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on column public.consultas_fornecedores.evidencias is
'Metadados e caminho privado da certidão. Nunca armazena o PDF diretamente na tabela.';
