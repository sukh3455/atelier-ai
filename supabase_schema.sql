-- ==============================================================================
-- ATELIER AI - SUPABASE DATABASE SCHEMA WITH 90% STORAGE AUTO-CLEAN RULE
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Create conversations table
create table if not exists public.conversations (
    id text primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null default 'New Chat',
    messages jsonb not null default '[]'::jsonb,
    is_pinned boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create index for fast user chat queries
create index if not exists idx_conversations_user_updated 
on public.conversations(user_id, updated_at desc);

-- 3. Enable Row Level Security (RLS) so users can ONLY access their own data
alter table public.conversations enable row level security;

-- Policies for complete user data isolation
drop policy if exists "Users can view their own conversations" on public.conversations;
create policy "Users can view their own conversations" 
on public.conversations for select 
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own conversations" on public.conversations;
create policy "Users can insert their own conversations" 
on public.conversations for insert 
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own conversations" on public.conversations;
create policy "Users can update their own conversations" 
on public.conversations for update 
using (auth.uid() = user_id);

drop policy if exists "Users can delete their own conversations" on public.conversations;
create policy "Users can delete their own conversations" 
on public.conversations for delete 
using (auth.uid() = user_id);

-- ==============================================================================
-- 4. 90% STORAGE AUTO-CLEAN RULE
-- Supabase free tier is 500 MB. 90% threshold is 450 MB (471,859,200 bytes).
-- When database size reaches 90%, it automatically prunes the oldest unpinned chats.
-- Pinned (is_pinned = true) chats are 100% protected and never deleted.
-- ==============================================================================

create or replace function public.auto_prune_at_90_percent()
returns trigger as $$
declare
    db_size_bytes bigint;
    max_threshold_bytes bigint := 471859200; -- 450 MB (90% of 500 MB)
begin
    -- Measure current database size
    select pg_database_size(current_database()) into db_size_bytes;
    
    -- If database exceeds 90% of free tier, auto-delete oldest 25 unpinned chats
    if db_size_bytes > max_threshold_bytes then
        delete from public.conversations
        where id in (
            select id from public.conversations
            where user_id = new.user_id and is_pinned = false
            order by updated_at asc
            limit 25
        );
    end if;
    return new;
end;
$$ language plpgsql security definer;

-- Trigger to run pruning check on conversation insert or update
drop trigger if exists trigger_auto_prune on public.conversations;
create trigger trigger_auto_prune
after insert or update on public.conversations
for each row execute function public.auto_prune_at_90_percent();
