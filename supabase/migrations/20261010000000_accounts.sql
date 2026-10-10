-- Accounts for Game Night: one profile per user, plus self-service deletion.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Player' check (char_length(display_name) between 1 and 30),
  avatar text not null default '🎲' check (char_length(avatar) <= 16),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Players can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Players can create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Players can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Create the profile as soon as someone signs up, using the name from the sign-up form.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar)
  values (
    new.id,
    coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 30), ''), 'Player'),
    coalesce(nullif(left(new.raw_user_meta_data ->> 'avatar', 16), ''), '🎲')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets a signed-in player delete their own account. The profile goes with it (on delete cascade).
create function public.delete_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
