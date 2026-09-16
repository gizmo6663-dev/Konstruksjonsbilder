# Konstruksjonsbilder

Nettapp som gjør et vanlig bilde om til en **byggemal** for strykeperler,
LEGO, Plus-Plus eller ditt eget materiale. Bildet tilpasses materialet:
riktig rutenett, riktige brikkefarger og riktig form på brikkene.

Alt skjer lokalt i nettleseren. Bildene lastes aldri opp noe sted.

## Hva den gjør

- **Last opp et bilde** – velg fil, dra og slipp, eller lim inn fra utklippstavla.
- **Velg materiale** – strykeperler (Hama/Perler midi), LEGO, Plus-Plus, eller
  en egendefinert palett du fyller inn selv.
- **Velg byggemåte** (LEGO) – liggende eller oppreist. Det avgjør formen på
  hver piksel: en plate sett ovenfra er 8 × 8 mm, mens forsiden av en kloss i
  en vegg er 8 × 9,6 mm. Uten det valget blir et oppreist motiv strukket 20 %
  på høyden.
- **Velg størrelse** – ferdige mål som ett perlebrett eller en LEGO-byggeplate,
  eller sett bredde og høyde selv. Med «Behold bildets proporsjoner» kan begge
  feltene styre: skriver du bredden følger høyden etter, og omvendt. For et
  høyt motiv er det høyden man vil låse – setter du den til 25, krymper
  bredden tilsvarende, og hele motivet holder seg innenfor ett brett.
  Størrelsesvalget er et tak motivet legges inn i, ikke en fast bredde.
  Appen viser hvor stort det ferdige bildet blir i centimeter.
- **Juster** – lysstyrke, kontrast, metning, dithering, kantstyrke og
  bakgrunnsfjerning. Kantstyrke trekker fram tynne konturer: en svart strek som
  dekker en tredjedel av ruta flytter gjennomsnittet bare en tredjedel av veien
  mot svart, og forsvinner når fargen rundes av til nærmeste brikke.
  Du kan også begrense antallet farger, eller skru av fargene du ikke har.
- **Få ut malen**:
  - **Skriv ut / lagre som PDF** – A4-sider med rutenett, symbol i hver rute,
    rad- og kolonnenummer, minikart over hvor på motivet siden hører hjemme,
    og en oversiktsside med fargeliste og antall brikker per farge.
    **Naturlig størrelse** skriver malen ut 1:1, slik at perlebrettet kan
    legges rett oppå arket og perlene settes i pinnene. Hver side har en
    50 mm kontrollinjal så du kan måle at utskriften ikke er skalert – slå av
    «Tilpass til side» i utskriftsdialogen.
  - **Last ned PNG** – enten et stort mønsterbilde eller ett bildepunkt per brikke.
  - **Fargeliste som tekstfil** – handleliste med antall.
  - **Byggemodus** – gå gjennom mønsteret rad for rad på skjerm, med
    «5 × rød, 3 × blå»-lister og avhaking. Fremdriften lagres lokalt.

## Hvordan det virker

Konverteringen gjøres i noen klart adskilte steg:

1. **Nedskalering** (`js/imageops.js`) – bildet skaleres til rutenettet med et
   bokfilter i lineært lys, slik at kanter og detaljer ikke blir mørkere enn de skal.
2. **Justering** – lysstyrke, kontrast og metning legges på de ferdig
   nedskalerte rutene.
3. **Fargematching** (`js/color.js`) – hver rute sammenlignes med paletten i
   **OKLab**, et fargerom der avstand tilsvarer hvor ulike fargene ser ut for øyet.
   Forskjell i lyshet teller halvt mot forskjell i fargetone: med lik vekt vinner
   lysheten for lett, og en lys lilla havner nærmere grå enn den eneste mørke
   lilla-en i paletten. Halv vekt treffer også rene gråtoner bedre – de gikk før
   til mørkegrønn og lyseblå.
4. **Dithering** (`js/quantize.js`) – valgfri feilspredning (Floyd–Steinberg
   eller Atkinson) i serpentinrekkefølge, slik at toneoverganger ikke blir flate.
5. **Rutenettgeometri** (`js/pattern.js`, `js/render.js`) – rutenettet er et
   gitter der hver rad kan være forskjøvet sidelengs, uttrykt som `rowShift`:
   andelen av en rutebredde raden flyttes i forhold til raden over.
   0 gir rette kolonner (perler, liggende LEGO, oppreist LEGO), og
   0,2 gir Plus-Plus sin fletting. Forskyvningen er kumulativ.

### Plus-Plus-gitteret

En Plus-Plus-brikke er ikke et plusstegn, men to plusstegn smeltet sammen – en
bred H der tverrstreken stikker ut på hver side. I enhetsruter:

```
. # . # .
# # # # #
. # . # .
```

Formen er 5 enheter bred, 3 høy og dekker 9 ruter. Den legges i den tette
flisleggingen: i samme vannrette linje ligger brikkene 9 enheter fra hverandre,
og hver rad er 1 enhet ned og 4 enheter sidelengs. Det gir en flate helt uten
hull, med trappetrinnkanter. Derfor er ruta 9 enheter bred og 1 høy, og
`rowShift` er 4/9.

Et polyomino med n ruter flislegger planet med et gitter nettopp når de n
rutene havner i hver sin sideklasse av gitteret. Kjører man den testen over
alle gitre med determinant 9, finnes det bare to som dekker denne brikka helt –
og de er speilbilder av hverandre.

To ting følger av at brikka bare dekker 9 av rutas 9 × 1 enheter, men i en helt
annen form enn ruta:

- **Prøvetaking.** Prøvetas ruta som helhet, blir hver brikke gjennomsnittet av
  en 36 × 4 mm stripe av bildet – ubrukelig. `sampleBoxes()` gir i stedet de 9
  rutene brikka faktisk dekker. Den omsluttende 5 × 3-boksen holder ikke: den
  inneholder 15 ruter, og de 6 som ikke er brikka tilhører nabobrikkene.
- **Tegning.** Både skjerm og utskrift tegner brikkas omriss, ikke rutas
  rektangel. En utskrift med 36 × 4 mm rektangler ville vært umulig å bygge
  etter.

Forskyvningen gjør også at mønsteret er bredere enn `gridW`: den mest
forskjøvede raden stikker 8/9 rute utenfor. Forholdsregningen bruker derfor
`spanX`, ikke `gridW` – ellers blir motivet bredere enn ment og beskåret på
høyden.

### Filer

| Fil | Ansvar |
| --- | --- |
| `js/color.js` | sRGB ↔ lineært lys ↔ OKLab, og nærmeste-farge-oppslag |
| `js/palettes.js` | Fargepaletter, gruppert i sett man kan skru av og på |
| `js/materials.js` | Materialdefinisjoner: rutenett, brikkeform, størrelser, tips |
| `js/imageops.js` | Innlesing, beskjæring, nedskalering, justering, bakgrunnsfjerning |
| `js/quantize.js` | Kvantisering, dithering, telling og symboltildeling |
| `js/pattern.js` | Mønstermodellen og geometrien |
| `js/render.js` | Tegning på lerret (perle, knott, plussbrikke, flat rute) |
| `js/printsheet.js` | A4-sider som SVG, oversiktsside og oppdeling over flere sider |
| `js/buildmode.js` | Byggemodus rad for rad |
| `js/app.js` | Grensesnitt og tilstand |

## Kjøre lokalt

Appen er ren HTML, CSS og JavaScript-moduler – ingen byggesteg og ingen
avhengigheter. Den må serveres over HTTP (ES-moduler fungerer ikke fra `file://`):

```sh
npx http-server -p 8080 .
# eller
python3 -m http.server 8080
```

Åpne så <http://localhost:8080>.

## Publisere

`.github/workflows/pages.yml` publiserer appen til GitHub Pages ved hvert push
til standardbranchen. Siden appen er ren statisk HTML, CSS og JavaScript,
lastes repoet opp som det er – ingen bygging.

Pages må slås på for repoet én gang før første publisering:
**Settings → Pages → Build and deployment → Source: GitHub Actions**.
Uten det stopper workflowen med `Get Pages site failed … Not Found`.
Workflowen kan ikke gjøre dette selv – `GITHUB_TOKEN` har ikke rettigheter
til å opprette et Pages-nettsted.

Appen kan også legges på hvilken som helst annen statisk hosting – den trenger
bare å serveres over HTTP.

## Lagrede innstillinger

Innstillinger lagres i `localStorage`. Brikkemålene er det geometrien hviler
på, og de er både materialets egenskap og noe brukeren kan overstyre. Et lagret
mål huskes derfor per materiale og byggemåte, sammen med standarden det ble satt
ut fra, og forkastes automatisk hvis materialet siden har endret geometri.

Uten det ville et mål lagret av en eldre versjon overstyrt den nye. Det skjedde
da Plus-Plus gikk fra 20 × 10 mm til 36 × 4 mm per rute: brikkene ble tegnet
med riktig form, men lagt ut etter det gamle målet, og mønsteret gikk ikke opp.
Nøkkelen er også versjonert (`:v2`), så innstillinger fra før denne ordningen
ignoreres i stedet for å bli tolket feil.

## Om fargene

Hex-verdiene i palettene er **tilnærminger laget for skjermvisning**. Ekte
perler og klosser har pigmenter som ikke lar seg gjengi eksakt på en skjerm,
og fargene varierer mellom produksjonspartier. Bruk fargelista som veiledning,
og sjekk mot brikkene du faktisk har.

Brikkemålene (5 mm per perle, 8 mm per LEGO-knott, 20 mm per Plus-Plus-brikke)
er nominelle standardverdier og kan overstyres under «Brikkemål og form».
Ferdigmålene vises derfor som «ca.».

For Plus-Plus varierer forholdet mellom bredde og høyde med hvordan brikkene
legges. Bygg en testflate på 4 × 4 brikker, mål den, og juster «brikkeform»
til motivet ikke blir strukket.
