# Konstruksjonsbilder

Nettapp som gjør et vanlig bilde om til en **byggemal** for strykeperler,
LEGO, Plus-Plus eller ditt eget materiale. Bildet tilpasses materialet:
riktig rutenett, riktige brikkefarger og riktig form på brikkene.

Alt skjer lokalt i nettleseren. Bildene lastes aldri opp noe sted.

## Hva den gjør

- **Last opp et bilde** – velg fil, dra og slipp, eller lim inn fra utklippstavla.
- **Velg materiale** – strykeperler (Hama/Perler midi), LEGO 1×1 plater,
  Plus-Plus, eller en egendefinert palett du fyller inn selv.
- **Velg størrelse** – ferdige mål som ett perlebrett (29 × 29) eller en
  LEGO-byggeplate (32 × 32), eller sett bredde og høyde selv. Appen viser
  hvor stort det ferdige bildet blir i centimeter.
- **Juster** – lysstyrke, kontrast, metning, dithering og bakgrunnsfjerning.
  Du kan også begrense antallet farger, eller skru av fargene du ikke har.
- **Få ut malen**:
  - **Skriv ut / lagre som PDF** – A4-sider med rutenett, symbol i hver rute,
    rad- og kolonnenummer, minikart over hvor på motivet siden hører hjemme,
    og en oversiktsside med fargeliste og antall brikker per farge.
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
   Det gir langt bedre treff enn å måle avstand i RGB.
4. **Dithering** (`js/quantize.js`) – valgfri feilspredning (Floyd–Steinberg
   eller Atkinson) i serpentinrekkefølge, slik at toneoverganger ikke blir flate.
5. **Rutenettgeometri** (`js/pattern.js`, `js/render.js`) – kvadratisk rutenett
   for perler og LEGO, forskjøvet rutenett for Plus-Plus der annenhver rad
   forskyves en halv brikke og radene ligger en halv brikkehøyde fra hverandre.

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

Legg innholdet på hvilken som helst statisk hosting. For GitHub Pages holder
det å peke Pages mot branchen – `.nojekyll` er allerede på plass.

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
