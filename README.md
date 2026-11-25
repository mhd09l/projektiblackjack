# Royal Club — Miniprojekti 1

## Projektin tarkoitus

Royal Club on responsiivinen virtuaalipelien kirjasto. Tavoitteena on koota pelien nimet, kategoriat ja kuvaukset yhteen helposti ylläpidettävään listaan, jotta tietoja voi selata ja muokata ilman lähdekoodin käsinmuokkausta. Käyttäjä voi selata JSON Serveriin tallennettuja pelejä ja lisätä, lukea, muokata tai poistaa niitä. Blackjack on pelattava; muut kirjaston pelit ovat esittelytietoja.

Pisteillä ei ole rahallista arvoa. Sovelluksessa ei käsitellä talletuksia tai oikeaa rahaa.

## Ominaisuudet

- Kolme erillistä näkymää: Etusivu, Pelikirjasto ja Tietoja.
- Pelitietojen CRUD JSON Serverin REST API:n kautta.
- Blackjack-peli, panosvalinta ja jaon tarkistus.
- Pelin lisäys- ja muokkausdialogi sekä poiston vahvistusdialogi.
- Palautteet Popover API:lla; lisäohjeet HTML:n `details`- ja `summary`-elementeillä.
- Järjestelmän vaaleaan tai tummaan väriteemaan mukautuva ulkoasu.
- Responsiivinen, mobiilista alkaen suunniteltu Flexbox- ja Grid-asettelu.

## Teknologiat

HTML, CSS, JavaScript, JSON, JSON Server, REST API, Fetch API, Git ja GitHub. Sovellus ei käytä Reactia, SQL-tietokantaa eikä omaa Node.js-palvelinta.

## Käynnistäminen

Tarvitset Node.js:n ja npm:n sekä selaimessa käytettävän staattisen palvelimen (esimerkiksi VS Coden Live Server -laajennuksen).

1. Asenna riippuvuudet projektin juuressa:

   ```sh
   npm install
   ```

2. Käynnistä JSON Server toisessa terminaalissa:

   ```sh
   npm run api
   ```

   API on osoitteessa `http://localhost:3000/games`. Tietokanta on `db.json`-tiedostossa.

3. Avaa projektin `index.html` Live Serverillä. Sivun ja API:n tulee olla käynnissä samanaikaisesti.

## CRUD-rajapinta

| Toiminto | HTTP-pyyntö |
| --- | --- |
| Pelien lukeminen | `GET /games` |
| Pelin lisääminen | `POST /games` |
| Pelin muokkaaminen | `PATCH /games/:id` |
| Pelin poistaminen | `DELETE /games/:id` |

Jos palvelin ei vastaa tai pyyntö epäonnistuu, käyttöliittymä näyttää virheilmoituksen.

## Projektisuunnitelma

- **Aihe:** virtuaalipelien kirjasto ja Blackjack.
- **Työpari:** täydennä opiskelijan ja työparin nimet.
- **Työnjako:** sopikaa ja kirjatkaa tähän, kuka vastaa käyttöliittymästä, CRUD/API-toiminnoista, testauksesta ja dokumentoinnista. Yksilötyössä merkitse tämä erikseen.
- **Työkalut ja kielet:** HTML, CSS, JavaScript, JSON Server, VS Code, selain, Git ja GitHub.
- **Aikataulu:** vaihe 1: rakenne ja näkymät; vaihe 2: JSON Server ja CRUD; vaihe 3: Blackjackin yhteensovitus, responsiivisuus ja saavutettavuus; vaihe 4: testaus, korjaukset ja dokumentointi. Lisää kurssin päivämäärät tähän.
- **Riskit ja niiden hallinta:**
  - JSON Server ei käynnisty tai API ei vastaa: tarkista Node/npm, portti 3000 ja `db.json`; näytä käyttäjälle virhe ja käynnistä API uudelleen.
  - Virheellinen syöte: käytä selaimen natiivivalidointia (`required`, pituusrajat ja kenttätyypit) ennen tallennusta.
  - Mobiilinäkymän vaakavieritys tai näppäimistöongelmat: testaa eri levyisillä näkymillä ja käytä sivustoa myös pelkällä näppäimistöllä.
  - Muutokset katoavat tai rikkovat toiminnon: tee Git-commit jokaisen valmiin työvaiheen jälkeen ja tarkista CRUD selaimessa.

## Git-työskentely

Tee useita pieniä, työvaiheita kuvaavia committeja (esimerkiksi näkymät, JSON Server/CRUD, saavutettavuus ja dokumentointi). Palauta GitHubiin myös `db.json` ja tämä README.
