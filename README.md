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
- **Taustapalvelu:** [Supabase](https://supabase.com) — PostgreSQL-tietokanta, autentikointi, Row Level Security -säännöt per käyttäjä sekä Edge Functions palvelinpuolen logiikkaan
- **Kuitin kuvaaminen:** tavallinen kamerakuva (`expo-image-picker`) — ei erillistä rajausta/suoristusta, koska tekoälypohjainen jäsennys lukee kuvan sellaisenaan eikä tarvitse niitä (ks. seuraava kohta). Aiemmin käytössä ollut natiivi dokumenttiskanneri (`react-native-document-scanner-plugin`) poistettiin: sen reunantunnistus oli hidas ja epäluotettava varsinkin vaaleaa taustaa vasten, eikä sen tekemä rajaus/suoristus tuonut enää hyötyä
- **Kuitin jäsennys (tekoäly):** kuva lähetetään Supabase Edge Functionin (`supabase/functions/parse-receipt`) kautta Googlen Gemini-näkömallille, joka lukee kuvan kokonaisuutena ja palauttaa jäsennetyn tuloksen (kauppa, päivämäärä, tuotteet hintoineen) — tarkempi kuin aiempi laitteella tehty tekstintunnistus + itse rakennettu rivinyhdistelylogiikka, joka sekoitti helposti vierekkäisten rivien hinnat jos kuva oli vähänkin vino. API-avain pysyy Edge Functionin puolella, ei koskaan mobiilisovelluksessa

## Tilanne nyt

**Toteutettu:**
- Rekisteröityminen, kirjautuminen ja uloskirjautuminen (Supabase Auth)
- Hierarkkisten luokkien ja alaluokkien luonti, muokkaus ja poisto, esimerkkiluokilla valmiiksi täytettynä uudelle käyttäjälle
- Manuaalinen menon lisäys, muokkaus ja poisto; luokan valinta pudotusvalikolla (pääluokka → alaluokka)
- Kuitin skannaus ja tekoälypohjainen jäsennys (kauppa, päivämäärä, tuotteet, hinnat), jokaisen rivin nimen/hinnan korjaaminen ja luokan valinta ennen tallennusta, ja jäsennetyn kuitin jokaisen rivin tallentaminen menoksi omaan luokkaansa

**Seuraavaksi** (tarkempi backlog [GitHub-issueissa](../../issues)):
- Luokkaehdotukset kuitin riveille aiempien tallennusten perusteella
- Kulutuksen yhteenvedot ja Excel-export
- Tilin poisto, jaettu talous toisen käyttäjän kanssa, ja muu backlogissa listattu

## Tiedossa olevat rajoitukset

- Kuitin kuvaaminen vaatii verkkoyhteyden (tekoälykutsu), eikä toimi täysin offline kuten aiempi laitteella tehty tekstintunnistus.
- Tekoälyjäsennys voi silti mennä harvoin pieleen esim. hyvin huonolaatuisella tai rypistyneellä kuitilla — siksi jokaisen rivin nimen, hinnan ja luokan voi tarkistaa ja korjata ennen tallennusta.
- Natiivi Jetpack Compose -pudotusvalikko (Android) osoittautui epäluotettavaksi kosketukselle, kun ruudulla on monta samanlaista valikkoa yhtä aikaa (esim. yksi per kuitin rivi) — tällaisissa näkymissä käytetään sen sijaan tavallista React Nativen omaa Modal-ikkunaa, jossa on myös hakukenttä (ks. `src/components/category-search-picker.tsx`).

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

Kuitinlukua varten tarvitaan lisäksi `parse-receipt`-niminen Edge Function:

1. Hae ilmainen Gemini API -avain osoitteesta [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Luo Supabasen dashboardissa **Edge Functions → Deploy a new function**, nimeä se `parse-receipt` ja liitä sisällöksi tiedoston `supabase/functions/parse-receipt/index.ts` koodi (tai käytä Supabase CLI:tä: `supabase functions deploy parse-receipt`)
3. Lisää funktiolle salaisuus **Edge Functions → Secrets**: `GEMINI_API_KEY` = hankittu avain

### Ajaminen

Ensimmäinen kerta (ja aina kun natiivipuolen riippuvuudet muuttuvat) vaatii täyden natiivibuildin:

```bash
npx expo run:android
```

Tämä kääntää koko natiivin Android-projektin ja kestää useita minuutteja. Sen jälkeen pelkät JS/TS-muutokset latautuvat nopeasti:

```bash
npx expo start --dev-client
```
