# Nalozi kupaca i rabati — podešavanje (jednom, ~20 minuta)

Sajt može da ima **registraciju i prijavu kupaca**. Vi odobravate svaki nalog i upisujete **rabat po grupi artikala** (Pneumatika, HEMA aerosol, Armirana creva i oprema, Traktorski program, Nastavci mazalica, plus opšti rabat). Kupac kada se prijavi vidi precrtanu cenu i cenu sa rabatom u detaljima artikla i u korpi, a u upitu koji stiže vama piše njegov rabat.

Dok ovo ne podesite, sajt radi kao do sada — dugmad za prijavu se ne prikazuju.

## 1. Servis za naloge (Supabase, besplatno)
1. Napravite nalog na https://supabase.com → **New project** (ime `partis`, izaberite region u Evropi, zapamtite lozinku baze).
2. Otvorite **SQL Editor → New query**, nalepite ceo sadržaj fajla `supabase-podesavanje.sql` iz paketa i kliknite **Run**.
3. **Authentication → Providers → Email**: isključite „Confirm email" (nalog ionako odobravate vi). Sačuvajte.
4. **Project Settings → API**: prepišite **Project URL** i **anon public** ključ. (Ključ „service_role" je tajan — njega NIKADA ne koristite.)

## 2. Povežite sajt
U programu `upravljanje.html` kliknite **Kupci**, upišite Project URL i anon ključ i sačuvajte. Zatim **Napravi sajt za objavu** i otpremite `dist` (kao i do sada).

## 3. Vaš administratorski nalog
1. Na sajtu kliknite **Registracija** i registrujte se svojim mejlom.
2. U Supabase **SQL Editor** pokrenite (sa vašim mejlom):
   `update public.profili set is_admin = true, odobren = true where email = 'VAS-MEJL@gmail.com';`
3. U programu **Kupci** prijavite se tim mejlom i lozinkom.

## 4. Svakodnevno
- Kupac se registruje na sajtu → u programu **Kupci** se pojavljuje žuto, „Čeka odobrenje".
- Podesite **Status: Odobren**, upišite rabate (u %) i kliknite **Sačuvaj**. Odmah važi — kupcu javite telefonom ili mejlom da može da se prijavi.
- Rabat: „Opšti" važi za grupe kojima nije upisan poseban rabat. Prazno = bez rabata.
- Za gašenje naloga vratite status na „Čeka odobrenje".
- Zaboravljena lozinka: kupac sam traži vezu na mejl („Zaboravili ste lozinku?").

## Šta treba da znate
- Rabat se na sajtu **prikazuje kupcu** i upisuje u upit koji vam stiže (polje „rabati" i pojedinačne cene). Konačnu cenu i dalje potvrđujete vi — proverite u programu **Kupci** da li rabat u upitu odgovara njegovom nalogu.
- Kupci vide samo svoj profil; samo vaš administratorski nalog može da menja rabate i status.
- Podaci kupaca su lični podaci: u fajlu `privatnost.html` (stranica „Politika privatnosti", link u podnožju) je predložak. **Pročitajte ga i prilagodite** (po potrebi uz savet pravnika). Registracija traži saglasnost kupca.
- Supabase besplatni paket je dovoljan za početak; projekat se pauzira posle dužeg perioda bez aktivnosti — dovoljno je da ga ponovo pokrenete u Supabase-u.
