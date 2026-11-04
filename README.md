# PARTIS Niš — sajt sa katalogom i editorom artikala

> **Najjednostavnije:** koristite program `upravljanje.html` na računaru — uputstvo je u fajlu **UPUTSTVO.md**. Ovaj dokument opisuje drugu varijantu (editor u pregledaču preko GitHub-a i Netlify-ja), koja vam nije obavezna.

Ovo je ceo sajt prodavnice. Artikli se ne menjaju u kodu, nego kroz **editor** (poseban link), nalik objavi na društvenim mrezama: izaberete kategoriju, ubacite sliku, upišete opis i cenu, kliknete **Objavi** — i posle ~1 minut je na sajtu.

Kupci vide samo sajt. Editor je na posebnoj adresi (`/admin/`) koja **nije povezana ni sa jednom stranicom sajta**, a pretraživači je ne indeksiraju.

---

## 1. Jednokratno podešavanje (radi se jednom, oko 30 minuta)

### Korak 1 — GitHub (čuva artikle i sajt)
1. Napravite nalog na https://github.com (ako ga nemate).
2. Kliknite **New repository**, ime npr. `partis-sajt`, izaberite **Private**, kliknite **Create**.
3. Otpremite sadržaj ovog paketa (**Add file → Upload files**, prevucite *sve fajlove i foldere iz paketa*, pa **Commit changes**).

### Korak 2 — Upisati ime repozitorijuma u editor
Otvorite fajl `static/admin/config.yml` (u GitHub-u, olovka za izmenu) i u liniji
`repo: VASE-GITHUB-IME/partis-sajt` upišite svoje GitHub korisničko ime i ime repozitorijuma (npr. `natalija123/partis-sajt`). Sačuvajte (**Commit changes**).

### Korak 3 — Netlify (objavljuje sajt)
1. Napravite nalog na https://app.netlify.com (prijava preko GitHub-a je najlakša).
2. **Add new site → Import an existing project → GitHub** i izaberite `partis-sajt`.
3. Podešavanja su već u fajlu `netlify.toml`, samo kliknite **Deploy**. Posle minut-dva sajt je na adresi tipa `ime.netlify.app`.

### Korak 4 — Uključiti prijavu za editor
1. Na GitHub-u: **Settings → Developer settings → OAuth Apps → New OAuth App**.
   - *Application name*: PARTIS editor
   - *Homepage URL*: adresa vašeg Netlify sajta (npr. `https://ime.netlify.app`)
   - *Authorization callback URL*: `https://api.netlify.com/auth/done`
   - Kliknite **Register application**, zatim **Generate a new client secret**. Prepišite *Client ID* i *Client secret*.
2. U Netlify-ju: **Site configuration → Access & security → OAuth → Install provider → GitHub**, nalepite *Client ID* i *Client secret*, **Install**.

### Korak 5 — Prvi ulaz
Otvorite `https://ime.netlify.app/admin/` → **Login with GitHub**. Dobićete spisak: Artikli, HEMA aerosol, Armirana gumena creva.

> **Savet:** Za editor uvek koristite adresu `…netlify.app/admin/` (čak i kada sajt dobije svoj domen). Sačuvajte je u obeleživače (Chrome/Brave). Tako je editor odvojen od sajta koji vide kupci.

### Korak 5b — Da upiti kupaca stižu na vaš mejl
Sajt ima **korpu za upit**: kupac doda artikle, upiše ime, telefon, mejl i adresu, i pošalje. Upit stiže preko Netlify-ja:
1. Prvo objavite sajt (Korak 3) i jednom ga osvežite posle objave.
2. U Netlify-ju: **Forms** (levi meni) — pojaviće se obrazac `porudzbenica`.
3. **Forms → Form notifications → Add notification → Email notification**, upišite mejl na koji želite upite (npr. `partis.trgovina@gmail.com`), obrazac: `porudzbenica`.
4. Pošaljite probni upit sa sajta i proverite da li stiže. Netlify besplatno prima do 100 upita mesečno; svi upiti se čuvaju i u Netlify-ju pod **Forms → Submissions**.

Ako slanje iz nekog razloga ne uspe, kupac vidi poruku i može da pošalje upit iz svog mejla ili da pozove radnju.

### Korak 6 — Pravi domen (kada ga budete imali)
1. U Netlify-ju: **Domain management → Add a domain**, pratite uputstvo (promena DNS-a kod firme gde je domen kupljen).
2. U GitHub-u otvorite fajl `site.json` i umesto `https://VASDOMEN.rs` upišite pravu adresu (npr. `https://partis.rs`). Ovo je važno za Google (mapa sajta i oznake pretrage).
3. U Google Search Console dodajte sajt i pošaljite `https://vasdomen.rs/sitemap.xml`.

### Ko još može da menja artikle?
GitHub repozitorijum → **Settings → Collaborators → Add people**. Svako ko se prijavi svojim GitHub nalogom može da koristi editor.

---

## 2. Svakodnevno korišćenje editora

**Novi artikal:** *Artikli → New Artikal*. Popunite:
- **Naziv**, **Kategorija** (bira se sa liste), **Slika** (Choose an image → Upload),
- **Opis** i **Kratak tekst na kartici** (jedna rečenica koja se vidi na kartici),
- **Cena** — za artikal sa jednom cenom. Za artikal sa više dimenzija: ostavite cenu praznom i u **Dimenzije / varijante** dodajte red po dimenziji (dimenzija + cena; slika po varijanti nije obavezna).
- Prazna cena = prikazuje se „Cena na upit".
- Kliknite **Publish → Publish now**. Sajt se osveži za ~1 minut.

**Nema na stanju („parkiranje"):** otvorite artikal, isključite **Na stanju**, **Publish**. Artikal nestaje sa sajta, iz pretrage i iz brojača (npr. „260 proizvoda"), a ostaje sačuvan. Kad stigne roba — ponovo uključite **Na stanju**.

**Promena cene/opisa:** otvorite artikal, izmenite, **Publish**.

**Brisanje:** dugme **Delete entry** (obrisan artikal se može vratiti iz istorije na GitHub-u, ali je parkiranje bezbednije).

**Alternativni nazivi:** polje „Alternativni nazivi" — reči pod kojima kupci traže artikal (npr. *navrtka*). Kupci ih ne vide, služe samo pretrazi.

**Redosled:** polje „Redosled" — manji broj ide ranije. Prazno = na kraj.

### Saveti za slike
- Artikal na **beloj pozadini**, ravno snimljen, JPG ili PNG.
- Sajt sam smanjuje slike (najviše 900 px), pa ne morate ništa da sabijate.
- Za sprejeve najbolje uspravna slika flaše.

---

## 3. Šta je u paketu (za one koji žele da znaju)

| Folder / fajl | Čemu služi |
|---|---|
| `content/` | Svi artikli, po jedan fajl (ovo menja editor) |
| `static/assets/` | Slike, izgled (`style.css`), logika sajta |
| `static/admin/` | Editor (`config.yml` = polja u editoru) |
| `templates/` | Okviri stranica (naslovi, opisi stranica za Google) |
| `build/build.mjs` | Pravi gotov sajt iz artikala (pokreće Netlify sam) |
| `site.json` | Adresa (domen) sajta |
| `categories.json` | Nazivi kategorija |

Lokalna provera (neobavezno, treba Node.js): `npm install` pa `npm run build`; gotov sajt je u `dist/`.

## 4. Ako nešto ne radi
- *Login ne uspeva:* proverite da li je u `config.yml` ispravno ime repozitorijuma i da je OAuth provider instaliran u Netlify-ju (Korak 4).
- *Izmena se ne vidi:* u Netlify-ju → **Deploys** vidite da li je izrada u toku ili je pala (crveno); poruka u dnevniku govori koji artikal ima grešku (npr. slika koja ne postoji).
- *Slika ne prikazuje:* proverite da je otpremljena (JPG/PNG) i da je izabrana u artiklu.
