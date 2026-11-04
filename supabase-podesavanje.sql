-- PARTIS — podešavanje naloga kupaca (Supabase)
-- Nalepite CEO ovaj tekst u Supabase: levi meni „SQL Editor" -> „New query" -> Run. Pokreće se jednom.

-- 1) Tabela sa profilima kupaca
create table if not exists public.profili (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  ime text,
  firma text,
  telefon text,
  adresa text,
  odobren boolean not null default false,   -- nalog aktivira prodavnica
  is_admin boolean not null default false,  -- samo vaš nalog
  rabati jsonb not null default '{}'::jsonb, -- npr. {"svi":5,"pneumatika":10,"hema":8}
  napomena text,
  created_at timestamptz not null default now()
);

alter table public.profili enable row level security;

-- 2) Pomoćna funkcija: da li je prijavljeni korisnik administrator
create or replace function public.je_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce((select is_admin from public.profili where id = auth.uid()), false)
$$;

-- 3) Pravila pristupa: kupac vidi SAMO svoj profil i ne može da ga menja; administrator vidi i menja sve
drop policy if exists "citanje" on public.profili;
create policy "citanje" on public.profili for select using (id = auth.uid() or public.je_admin());

drop policy if exists "admin izmena" on public.profili;
create policy "admin izmena" on public.profili for update using (public.je_admin()) with check (public.je_admin());

drop policy if exists "admin brisanje" on public.profili;
create policy "admin brisanje" on public.profili for delete using (public.je_admin());

-- 4) Kada se kupac registruje, automatski se pravi profil (neodobren, bez rabata)
create or replace function public.novi_korisnik() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profili (id, email, ime, firma, telefon, adresa)
  values (new.id, new.email,
          new.raw_user_meta_data->>'ime', new.raw_user_meta_data->>'firma',
          new.raw_user_meta_data->>'telefon', new.raw_user_meta_data->>'adresa');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.novi_korisnik();

-- 5) POSLE prve registracije svog naloga na sajtu, pokrenite (sa svojim mejlom) da postanete administrator:
--    update public.profili set is_admin = true, odobren = true where email = 'VAS-MEJL@gmail.com';
