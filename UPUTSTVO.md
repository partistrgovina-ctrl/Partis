# PARTIS — upravljanje artiklima sa računara (najjednostavniji način)

Ne treba vam GitHub, nalozi ni instalacija. Imate jedan program (`upravljanje.html`) koji se otvara dvoklikom u **Chrome-u ili Brave-u** i menja artikle direktno u folderu sa sajtom.

## Šta je u folderu
- `upravljanje.html` — program za artikle (ovo otvarate)
- `content/` — artikli (menja ih program)
- `static/`, `templates/`, `build/` — slike, izgled i izrada sajta (ne dirati)
- `site.json` — adresa sajta
- `dist/` — GOTOV SAJT, nastaje kada kliknete „Napravi sajt za objavu". Ovaj folder otpremate na internet.

## Svakodnevno
1. Raspakujte paket na računar (npr. `Dokumenti\PARTIS-sajt`) i **ostavite folder tu** — svaki put radite u njemu.
2. Dvoklik na `upravljanje.html` (ako se ne otvori u Chrome/Brave: desni klik → *Otvori pomoću* → Chrome/Brave).
3. Prvi put kliknite **Izaberi folder sajta** i izaberite glavni folder (u njemu su `content`, `static`, `templates`). Pregledač pita za dozvolu — dozvolite izmene. Sledeći put samo kliknete **Nastavi sa folderom**.

### Novi artikal
**+ Novi artikal** → popunite naziv, kategoriju, sliku (izaberete fajl sa računara), opis i cenu → **Sačuvaj**.
- Za artikal sa više dimenzija ostavite „Cena" praznom i u tabeli dodajte red po dimenziji (**+ Dodaj red**).
- Prazna cena = na sajtu piše „Cena na upit".
- Program sam smanjuje sliku i stavlja belu pozadinu.

### Parkiranje (nema na stanju)
U listi pored artikla je prekidač **Na stanju / Parkirano**. Parkiran artikal nestaje sa sajta, iz pretrage i iz brojača, a ostaje sačuvan. Kad stigne roba, vratite prekidač.

### Parkiranje pojedinačnih dimenzija
Kod artikla sa više dimenzija (npr. spojnice) kliknite na **▸ varijante: 22 / 22 na stanju** — otvara se spisak svih dimenzija, svaka sa svojim prekidačem **Na stanju / Parkirano** (i dugmad „Sve na stanju" / „Sve parkirano"). Na sajtu se u tabeli vide samo dimenzije koje su na stanju, a brojač proizvoda se sam usklađuje. Ako parkirate sve dimenzije, artikal nestaje sa sajta. Isti prekidač (kolona „Na stanju") je i u prozoru **Izmeni**.

### Izmena i brisanje
**Izmeni** otvara artikal (naziv, opis, cene, slika, redosled, alternativni nazivi za pretragu). Dugme **Obriši** briše trajno — bezbednije je parkirati.

### Izmene još nisu na sajtu!
Sve što radite čuva se u folderu na računaru. Da bi se videlo na internetu:
1. Kliknite **Napravi sajt za objavu** (gore desno). Pojaviće se folder `dist`.
2. (Neobavezno) pregled: otvorite `dist\index.html` dvoklikom.
3. Otpremite ga (sledeći odeljak).

## Otpremanje na internet (prvi put i svaki put kad se menja)
Najlakše: **Netlify**, besplatno, bez GitHub-a.
1. Napravite nalog na https://app.netlify.com (jednom).
2. Otvorite https://app.netlify.com/drop i prevucite **folder `dist`** u prozor. Za par sekundi sajt je na adresi tipa `ime.netlify.app`.
3. **Sledeći put (izmena):** u Netlify-ju otvorite vaš sajt → **Deploys** → prevucite novi `dist` u označeno polje. Adresa ostaje ista (ne koristite ponovo /drop, to pravi novi sajt).
4. Svoj domen: **Domain management → Add a domain**, pa u programu kliknite **Domen** i upišite adresu (npr. `https://partis.rs`), ponovo **Napravi sajt** i otpremite `dist`.

Ako već imate drugi hosting (FTP/cPanel): otpremite **sadržaj** foldera `dist` (ne sam folder) u glavni folder sajta (`public_html`).

## Korpa za upit — da stiže na vaš mejl
Korpa šalje upite preko Netlify obrasca (radi na Netlify hostingu):
1. Posle prvog otpremanja: Netlify → vaš sajt → **Forms** — vidi se obrazac `porudzbenica`.
2. **Forms → Form notifications → Add notification → Email notification**, upišite mejl (npr. `partis.trgovina@gmail.com`), obrazac `porudzbenica`.
3. Pošaljite probni upit sa sajta. Besplatno je do 100 upita mesečno; svi se čuvaju i pod **Forms → Submissions**.

## Nalozi kupaca i rabati (neobavezno)
Registracija kupaca i rabati po grupi artikala — pogledajte **UPUTSTVO-KUPCI.md**. Dugme **Kupci** u programu služi za odobravanje naloga i upis rabata.

## Pravila i saveti
- **Nemojte** premeštati ni preimenovati foldere u paketu.
- Slike: artikal na beloj pozadini, JPG ili PNG.
- Pravite **rezervnu kopiju** celog foldera (npr. na USB ili Google Drive) s vremena na vreme — tu su svi artikli.
- Program radi samo u Chrome-u i Brave-u (Firefox i Safari ne dozvoljavaju rad sa folderima).
- Ako program traži dozvolu pri svakom otvaranju — to je normalno, kliknite **Dozvoli**.

*(Postoji i druga varijanta — editor u pregledaču preko GitHub-a i Netlify-ja, opisana u README.md. Nije potrebna ako koristite ovaj program.)*

## Offline katalog za slanje mejlom (PARTIS-katalog.html)

Svaki put kada kliknete „Napravi sajt za objavu" (ili `npm run build`) u folderu `dist` nastane i fajl **PARTIS-katalog.html**.
To je ceo katalog u jednom fajlu (sa slikama, bez interneta, bez hostinga).

1. Priložite `PARTIS-katalog.html` mejlu kupcu (ima oko 2 MB).
2. Kupac ga otvori dvoklikom, izabere artikle, doda ih u korpu i klikne „Pošalji upit".
3. Unese ime, telefon, mejl i adresu. Otvara se njegov mejl program (ili Gmail) sa već napisanim upitom za `partis.trgovina@gmail.com`. Kupac samo pritisne **Pošalji**.
4. Ako se mejl program ne otvori, kupac može da kopira tekst ili preuzme upit kao .txt fajl.

Napomene: slanje mora da potvrdi kupac u svom mejl programu (ni jedan fajl ne može sam da pošalje mejl). Cene u fajlu su one iz trenutka pravljenja — kada menjate cene, napravite novi fajl. Nalozi kupaca i rabati ne rade u ovoj varijanti. Mobilni telefon: fajl se lakše otvara na računaru; ako se otvara iz mejla na telefonu, bolje je slati link do sajta.
Ako sajt postavite na hosting, isti fajl je dostupan i na `vašdomen/PARTIS-katalog.html`.

## Kategorije (dugme „Kategorije“ u programu)

Kartice u programu (Pneumatika, HEMA aerosol, Armirana creva i oprema, Traktorski program, Nastavci mazalica i vaše nove) odgovaraju kategorijama na sajtu. Potkategorije (npr. Spojnice pneumatike) biraju se u polju „Kategorija“ kod artikla, a u listi ih filtrira padajući meni.

- **Dodavanje:** „Kategorije“ → upišite naziv i opis → „Dodaj“. Nova kategorija dobija svoju karticu u programu, stranicu, stavku u meniju i pločicu na početnoj (čim ima artikala).
- **Uklanjanje nove kategorije:** dugme „Ukloni“, moguće kada u njoj nema artikala.
- **Preimenovanje:** u dijalogu „Kategorije“ upišite novi naziv pored kategorije (ili potkategorije) i kliknite „Preimenuj“. Naziv se menja svuda na sajtu (meni, naslovi, pločice, kartice). Za vraćanje upišite stari naziv.
- **Brisanje postojeće kategorije:** „Obriši“ trajno briše SVE artikle te kategorije i sakriva je (ne može se vratiti). Za privremeno skidanje koristite „Sakrij“.
- **Sakrivanje postojeće kategorije:** „Sakrij sa sajta“. Cela kategorija nestaje sa sajta (stranica, meni, pločica, pretraga), a artikli ostaju sačuvani. „Prikaži na sajtu“ je vraća.
- Posle svake promene kliknite „Napravi sajt za objavu“ i otpremite folder dist.
- Rabati za nove kategorije vode se pod grupom „Ostale (nove) kategorije“.

## Tekst početne stranice (dugme „Tekst početne“ u programu)

Kliknite „Tekst početne“ pa izmenite: glavni naslov (reč između zvezdica *ovako* postaje crvena), opis ispod naslova, kartice sa informacijama o cenama i sečenju creva, opise pločica kategorija i tekst koji vidi Google. Brojevi telefona i reč WhatsApp u karticama sami postaju linkovi. Ako obrišete polje, vraća se početni tekst. Na kraju kliknite „Sačuvaj“, pa „Napravi sajt za objavu“.
