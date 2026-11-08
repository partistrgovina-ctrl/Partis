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


-- =====================================================================
-- DOPUNA (nalog kupca: izmena podataka + istorija porudžbina) — pokrenuti jednom
-- =====================================================================
alter table public.profili add column if not exists pib text;

-- trigger sada prenosi i PIB iz registracije
create or replace function public.novi_korisnik() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profili (id, email, ime, firma, pib, telefon, adresa)
  values (new.id, new.email,
          new.raw_user_meta_data->>'ime', new.raw_user_meta_data->>'firma', new.raw_user_meta_data->>'pib',
          new.raw_user_meta_data->>'telefon', new.raw_user_meta_data->>'adresa');
  return new;
end $$;

-- kupac menja SAMO svoje kontakt podatke (ne rabate, ne odobrenje, ne admin pravo)
create or replace function public.azuriraj_profil(p_ime text, p_firma text, p_pib text, p_telefon text, p_adresa text)
returns void language sql security definer set search_path = public as $$
  update public.profili set ime = left(p_ime,200), firma = left(p_firma,200), pib = left(p_pib,9),
         telefon = left(p_telefon,50), adresa = left(p_adresa,300)
  where id = auth.uid();
$$;
revoke all on function public.azuriraj_profil(text,text,text,text,text) from public;
grant execute on function public.azuriraj_profil(text,text,text,text,text) to authenticated;

-- istorija porudžbina
create table if not exists public.porudzbine (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  stavke jsonb not null default '[]'::jsonb,
  ukupno jsonb not null default '{}'::jsonb,
  dostava text,
  napomena text,
  status text not null default 'poslato'
);
alter table public.porudzbine enable row level security;
drop policy if exists "svoje citanje" on public.porudzbine;
create policy "svoje citanje" on public.porudzbine for select using (user_id = auth.uid() or public.je_admin());
drop policy if exists "svoj upis" on public.porudzbine;
create policy "svoj upis" on public.porudzbine for insert with check (user_id = auth.uid());
drop policy if exists "admin izmena porudzbina" on public.porudzbine;
create policy "admin izmena porudzbina" on public.porudzbine for update using (public.je_admin()) with check (public.je_admin());

-- postojeći nalozi: PIB iz registracije (ako je poslat) prepiši u profil
update public.profili p set pib = u.raw_user_meta_data->>'pib'
from auth.users u where u.id = p.id and p.pib is null and u.raw_user_meta_data->>'pib' is not null;


-- =====================================================================
-- DOPUNA 2 (faktura PDF, broj pošiljke, nema na stanju) — pokrenuti jednom, posle prve dopune
-- =====================================================================
alter table public.porudzbine add column if not exists kurir text;
alter table public.porudzbine add column if not exists posiljka text;
alter table public.porudzbine add column if not exists faktura_path text;

-- privatni prostor za fakture (putanja: ID-kupca/ID-porudzbine.pdf)
insert into storage.buckets (id, name, public) values ('fakture', 'fakture', false) on conflict (id) do nothing;

drop policy if exists "fakture citanje" on storage.objects;
create policy "fakture citanje" on storage.objects for select
  using (bucket_id = 'fakture' and ((storage.foldername(name))[1] = auth.uid()::text or public.je_admin()));
drop policy if exists "fakture upis" on storage.objects;
create policy "fakture upis" on storage.objects for insert
  with check (bucket_id = 'fakture' and public.je_admin());
drop policy if exists "fakture izmena" on storage.objects;
create policy "fakture izmena" on storage.objects for update
  using (bucket_id = 'fakture' and public.je_admin()) with check (bucket_id = 'fakture' and public.je_admin());
drop policy if exists "fakture brisanje" on storage.objects;
create policy "fakture brisanje" on storage.objects for delete
  using (bucket_id = 'fakture' and public.je_admin());
