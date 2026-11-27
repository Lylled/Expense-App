# Kuittikamu

Mobiilisovellus kuittikuvien perusteella tapahtuvaan kulutusseurantaan. Käyttäjä kuvaa kuitin, sovellus lukee kuitista tekstin ja ehdottaa jatkossa luokkia aiempien merkintöjen perusteella, ja käyttäjä voi korjata ehdotukset.

**Projekti on kesken.** Tämä README kuvaa tilanteen sellaisena kuin se nyt on, ei lopullista visiota.

## Idea

- Kuvaa kuitti → sovellus tunnistaa kaupan, päivämäärän ja ostetut tuotteet hintoineen
- Jokaiselle kuitin tuoteriville ehdotetaan luokkaa aiempien tallennusten perusteella; käyttäjä voi korjata ehdotuksen
- Luokat ovat hierarkkisia, esim. `KOTI` → Ruoka, Hygienia, Sisustus
- Viikko- ja kuukausitason sekä pidemmän aikavälin yhteenvedot kokonaiskulutuksesta ja luokittain

## Tekninen toteutus

- **Alusta:** Expo / React Native, TypeScript, Expo Router -reititys. Kohdealustana tällä hetkellä Android (iOS/web eivät vielä testattuja osiltaan, jotka käyttävät natiivimoduuleja)
- **Taustapalvelu:** [Supabase](https://supabase.com) — PostgreSQL-tietokanta, autentikointi ja Row Level Security -säännöt per käyttäjä
- **Kuitin skannaus:** natiivi dokumenttiskanneri (`react-native-document-scanner-plugin`, pohjautuu Googlen ML Kit Document Scanneriin) rajaa ja suoristaa (deskew) kuitin kuvasta automaattisesti ennen tekstintunnistusta
- **Tekstintunnistus (OCR):** Google ML Kit (`@react-native-ml-kit/text-recognition`), toimii laitteella paikallisesti
- **Kuitin jäsennys:** oma logiikka (`src/lib/parse-receipt.ts`), joka kokoaa ML Kitin löytämät tekstinpätkät takaisin riveiksi niiden sijaintitiedon perusteella (OCR ei muuten palauta tekstiä rivijärjestyksessä) ja poimii tuloksesta kaupan nimen, päivämäärän sekä tuotteet hintoineen

## Tilanne nyt

**Toteutettu:**
- Rekisteröityminen, kirjautuminen ja uloskirjautuminen (Supabase Auth)
- Hierarkkisten luokkien ja alaluokkien luonti, muokkaus ja poisto, esimerkkiluokilla valmiiksi täytettynä uudelle käyttäjälle
- Kuitin skannaus, tekstintunnistus ja jäsennys (kauppa, päivämäärä, tuotteet, hinnat) — toimii omalla testinäytöllään, mutta **ei ole vielä yhdistetty varsinaiseen menojen tallennukseen**

**Seuraavaksi** (tarkempi backlog [GitHub-issueissa](../../issues)):
- Kuitilta luetun kuvan/tekstin muuttaminen tallennetuksi menoksi oikeaan luokkaan
- Luokkaehdotukset kuitin riveille
- Manuaalinen menon lisäys ilman kuittikuvaa
- Kulutuksen yhteenvedot ja Excel-export
- Tilin poisto, jaettu talous toisen käyttäjän kanssa, ja muu backlogissa listattu

## Kehitysympäristön pystytys

### Vaatimukset

- Node.js 20 LTS tai uudempi
- Android Studio + Android SDK (sovellus käyttää natiivimoduuleja, **ei toimi Expo Go -sovelluksessa** — tarvitaan oma dev-client-build)
- JDK 17 Gradle-buildia varten — Android Studion mukana tuleva uusin JDK (esim. 21+) ei tällä hetkellä toimi tämän projektin natiivibuildien kanssa
- Ilmainen [Supabase](https://supabase.com)-projekti

### Asennus

```bash
git clone <repo-url>
cd Expense-App
npm install
```

Luo projektin juureen `.env.local`-tiedosto (ei committoida gittiin):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Arvot löytyvät Supabasen dashboardista (**Settings → API**). Käytä **Publishable key** -arvoa — ei koskaan Secret/service_role-avainta, joka ei saa päätyä mobiilisovellukseen.

Aja `supabase/sql/`-kansion tiedostot Supabasen **SQL Editorissa** numerojärjestyksessä — ne luovat `categories`-taulun, tietoturvasäännöt (RLS) ja oletusluokkien automaattisen luonnin uusille käyttäjille.

### Ajaminen

Ensimmäinen kerta (ja aina kun natiivipuolen riippuvuudet muuttuvat) vaatii täyden natiivibuildin:

```bash
npx expo run:android
```

Tämä kääntää koko natiivin Android-projektin ja kestää useita minuutteja. Sen jälkeen pelkät JS/TS-muutokset latautuvat nopeasti:

```bash
npx expo start --dev-client
```
