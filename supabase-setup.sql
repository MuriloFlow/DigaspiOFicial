-- ============================================
-- SUPABASE — Execute este SQL no SQL Editor do Supabase
-- Acesse: https://supabase.com → Seu projeto → SQL Editor → New Query
-- Cole todo este conteúdo e clique "Run"
-- ============================================

-- 1) Tabela de colaboradores (operadores)
create table if not exists collaborators (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now() not null
);

-- 2) Tabela de registros de cartões
create table if not exists records (
  id uuid default gen_random_uuid() primary key,
  collaborator_id uuid not null references collaborators(id) on delete cascade,
  operator_name text not null,
  client_name text not null,
  amount_in_cents integer not null check (amount_in_cents > 0),
  activated boolean default false not null,
  created_at timestamptz default now() not null
);

-- 3) Índices para performance
create index if not exists idx_records_collaborator_id on records(collaborator_id);
create index if not exists idx_records_created_at on records(created_at desc);
create index if not exists idx_records_operator_name on records(operator_name);
create index if not exists idx_collaborators_name on collaborators(name);

-- 4) Habilitar RLS (Row Level Security) — permissão pública para o app
alter table collaborators enable row level security;
alter table records enable row level security;

-- Políticas de acesso público (ajuste conforme sua necessidade de segurança)
create policy "Allow public read collaborators" on collaborators for select using (true);
create policy "Allow public insert collaborators" on collaborators for insert with check (true);
create policy "Allow public update collaborators" on collaborators for update using (true);
create policy "Allow public delete collaborators" on collaborators for delete using (true);

create policy "Allow public read records" on records for select using (true);
create policy "Allow public insert records" on records for insert with check (true);
create policy "Allow public update records" on records for update using (true);
create policy "Allow public delete records" on records for delete using (true);
