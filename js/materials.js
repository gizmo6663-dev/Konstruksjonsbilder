import { PLUSPLUS_CELLS } from './pattern.js';

// Materialdefinisjoner: hvordan rutenettet ser ut, hvilken palett som brukes,
// og hvilke størrelser som er praktiske å bygge.
//
// `pitch` er omtrentlig fysisk størrelse per brikke i millimeter, og er eneste
// kilde til brikkeform: forholdet w/h avgjør om pikslene er kvadratiske eller
// ikke. Verdiene kan overstyres i appen, og styrer også ferdigmålet som vises.
//
// `fixedShape` betyr at materialet har en gitt form – endrer man bredden,
// følger høyden etter i samme forhold.
//
// Et materiale kan ha `variants`: ulike måter å bygge det samme materialet på.
// LEGO har det, fordi en plate sett ovenfra er kvadratisk (8 × 8 mm), mens
// forsiden av en kloss i en vegg er høyere enn den er bred (8 × 9,6 mm).

export const MATERIALS = [
  {
    id: 'perler',
    name: 'Strykeperler',
    short: 'Perler',
    icon: 'bead',
    description: 'Hama / Perler / Nabbi midi-perler på perlebrett.',
    palette: 'hama-midi',
    grid: 'square',
    fixedShape: true,
    style: 'bead',
    unit: 'perle',
    unitPlural: 'perler',
    pitch: { w: 5, h: 5 },
    presets: [
      { name: '25 × 25 pinner', w: 25, h: 25 },
      { name: '29 × 29 pinner', w: 29, h: 29 },
      { name: '20 × 20 pinner', w: 20, h: 20 },
      { name: '14 × 14 pinner (lite brett)', w: 14, h: 14 },
      { name: '50 × 50 – flere brett', w: 50, h: 50 },
      { name: '58 × 58 – flere brett', w: 58, h: 58 },
    ],
    tips: [
      'Tell pinnene på ditt eget brett og skriv inn tallet – kvadratiske brett varierer mellom merkene, typisk mellom 14 og 29 pinner. Er malen bredere enn brettet, må motivet bygges over flere brett.',
      'Vil du legge brettet rett oppå utskriften? Velg «Naturlig størrelse» under Skriv ut, og slå av «Tilpass til side» i utskriftsdialogen. Mål kontrollinjalen nederst på arket for å sjekke at skalaen stemmer.',
      'Legg bakepapir over før du stryker, og stryk begge sider hvis motivet skal tåle håndtering.',
      'Motiv med tomme ruter kan falle fra hverandre – sørg for at alle perler henger sammen.',
    ],
  },
  {
    id: 'lego',
    name: 'LEGO',
    short: 'LEGO',
    icon: 'stud',
    description: 'Klossmosaikk. Velg om bildet skal bygges flatt eller stå opp.',
    palette: 'lego',
    grid: 'square',
    fixedShape: true,
    variants: [
      {
        id: 'liggende',
        short: 'liggende',
        name: 'Liggende – plater flatt på byggeplate',
        // Sett ovenfra er knottavstanden lik i begge retninger.
        hint: 'Bildet ses ovenfra. Hver rute er én 1 × 1 plate, 8 × 8 mm, så pikslene blir kvadratiske.',
        style: 'stud',
        unit: 'plate',
        unitPlural: 'plater',
        pitch: { w: 8, h: 8 },
        presets: [
          { name: 'Byggeplate – 32 × 32', w: 32, h: 32 },
          { name: 'Stor plate – 48 × 48', w: 48, h: 48 },
          { name: 'Liten plate – 16 × 16', w: 16, h: 16 },
          { name: '4 plater – 64 × 64', w: 64, h: 64 },
          { name: 'Portrett – 48 × 64', w: 48, h: 64 },
        ],
        tips: [
          'Bruk 1 × 1 plater (del 3024). Ligger flere like farger på rad, kan de erstattes med 1 × 2, 1 × 3 eller 1 × 4 plater – det holder bedre sammen og blir billigere.',
          'En standard byggeplate er 32 × 32 knotter. Skal du ha flere plater ved siden av hverandre, bind dem sammen på baksiden.',
          'Henger bildet på veggen? Bygg et lag plater i bunn før mosaikken, så sitter brikkene bedre.',
        ],
      },
      {
        id: 'staaende-kloss',
        short: 'oppreist med klosser',
        name: 'Oppreist – klosser stablet i høyden',
        // En kloss er 9,6 mm høy og 8 mm bred. Uten denne forskjellen blir
        // motivet strukket 20 % på høyden.
        hint: 'Bildet ses forfra, som en vegg. Hver rute er forsiden av én 1 × 1 kloss, 8 × 9,6 mm – høyere enn den er bred, så malen får færre rader enn kolonner.',
        style: 'brick',
        buildFromBottom: true,
        unit: 'kloss',
        unitPlural: 'klosser',
        pitch: { w: 8, h: 9.6 },
        presets: [
          { name: 'Vegg – 32 klosser bred', w: 32, h: 27 },
          { name: 'Liten vegg – 16 bred', w: 16, h: 13 },
          { name: 'Mellom – 24 bred', w: 24, h: 20 },
          { name: 'Stor vegg – 48 bred', w: 48, h: 40 },
        ],
        tips: [
          'Bygg rad for rad nedenfra. Slå sammen like farger ved siden av hverandre til 1 × 2, 1 × 3 og 1 × 4 klosser – da griper radene i hverandre og veggen henger sammen. En vegg av bare 1 × 1 klosser står ikke støtt.',
          'Forskyv skjøtene mellom radene der du kan, akkurat som i en murvegg. Byggemodus viser hvor de lange fargestrekkene er.',
          'Start på en byggeplate eller en rad lange plater, og legg gjerne et lag plater øverst som avslutning.',
          'Trenger du finere detaljer i høyden, bytt til «Oppreist – plater»: en plate er en tredjedel så høy som en kloss.',
        ],
      },
      {
        id: 'staaende-plate',
        short: 'oppreist med plater',
        name: 'Oppreist – plater stablet i høyden',
        hint: 'Som over, men bygget av 1 × 1 plater: 8 × 3,2 mm per rute. Tre ganger så fin oppløsning loddrett – og tre ganger så mange rader.',
        style: 'brick',
        buildFromBottom: true,
        unit: 'plate',
        unitPlural: 'plater',
        pitch: { w: 8, h: 3.2 },
        presets: [
          { name: 'Vegg – 24 plater bred', w: 24, h: 60 },
          { name: 'Liten – 16 bred', w: 16, h: 40 },
          { name: 'Stor – 32 bred', w: 32, h: 80 },
          { name: 'Ekstra stor – 48 bred', w: 48, h: 120 },
        ],
        tips: [
          'Tre plater i høyden tilsvarer én kloss. Malen blir høy: regn med rundt 2,5 ganger så mange rader som kolonner for et kvadratisk motiv.',
          'Slå sammen like farger på rad til lange plater, og forskyv skjøtene mellom radene – ellers deler veggen seg i loddrette søyler.',
          'En vegg av bare plater er skjør. Legg inn et lag klosser med jevne mellomrom, eller bygg mot en bakplate.',
        ],
      },
    ],
  },
  {
    id: 'plusplus',
    name: 'Plus-Plus',
    short: 'Plus-Plus',
    icon: 'plus',
    description: 'Plus-Plus-brikker lagt flatt, flettet tett uten hull.',
    palette: 'plusplus',
    grid: 'lattice',
    // Brikka er en bred H - to plusstegn smeltet sammen - 5 enheter bred og
    // 3 hoey, 9 ruter i alt. Dette er den tette flisleggingen: i samme
    // vannrette linje ligger brikkene 9 enheter fra hverandre, og hver rad er
    // 1 enhet ned og 4 enheter sidelengs. Ingen hull, men trappetrinnkanter.
    unitCols: 9,
    pieceUnits: { w: 5, h: 3 },
    pieceCells: PLUSPLUS_CELLS,
    rowShift: 4 / 9,
    fixedShape: true,
    style: 'plus',
    unit: 'brikke',
    unitPlural: 'brikker',
    // Én enhet er ca. 4 mm, så brikka blir ca. 20 mm bred.
    // Ruta er 9 enheter bred og 1 enhet høy: 36 × 4 mm.
    pitch: { w: 36, h: 4 },
    // Høyden er et tak, og med 9 enheter bredde mot 1 i høyden trengs det
    // mange rader: et kvadratisk motiv på 6 ruter bredt er 54 rader høyt.
    // Takene må være rause, ellers kapper de hvert eneste portrettbilde.
    presets: [
      { name: 'Lite – ca. 22 cm bredt', w: 6, h: 160 },
      { name: 'Mellom – ca. 29 cm bredt', w: 8, h: 210 },
      { name: 'Stort – ca. 40 cm bredt', w: 11, h: 290 },
      { name: 'Ekstra stort – ca. 50 cm bredt', w: 14, h: 300 },
    ],
    tips: [
      'Dette er den tette flettingen: brikkene dekker flaten helt, uten hull. Til gjengjeld blir kantene trappetrinn – de blir ikke rette.',
      'Hver rad ligger én enhet ned og fire enheter til høyre for raden over. I samme vannrette linje er det ni enheter mellom brikkene, og mellomrommet fylles av brikkene fra radene rundt.',
      'Etter ni rader står mønsteret rett under seg selv igjen. Mister du takten, tell deg tilbake dit.',
      'Måler brikkene dine noe annet enn 20 mm brede, endre tallene under Brikkemål – ruta er 9/5 av en brikkebredde bred og 1/5 høy.',
    ],
  },
  {
    id: 'generisk',
    name: 'Egendefinert',
    short: 'Egen',
    icon: 'square',
    description: 'Egne farger og egen rutestørrelse – mosaikk, broderi, strikk, hva som helst.',
    palette: 'generisk',
    grid: 'square',
    fixedShape: false,
    style: 'flat',
    unit: 'rute',
    unitPlural: 'ruter',
    pitch: { w: 10, h: 10 },
    presets: [
      { name: '16 × 16', w: 16, h: 16 },
      { name: '32 × 32', w: 32, h: 32 },
      { name: '48 × 48', w: 48, h: 48 },
      { name: '64 × 64', w: 64, h: 64 },
      { name: '100 × 100', w: 100, h: 100 },
    ],
    tips: [
      'Legg inn dine egne farger under «Farger jeg har». Du kan endre både navn, kode og fargeverdi.',
      'Sett rutestørrelsen i mm under Størrelse for å få riktig ferdigmål.',
    ],
  },
];

export function getMaterial(id) {
  return MATERIALS.find((m) => m.id === id) || MATERIALS[0];
}

/**
 * Slår sammen et materiale med den valgte byggemåten, og utleder brikkeformen
 * fra brikkemålene. `pitchOverride` lar brukerens egne mm-verdier gjelde.
 */
export function resolveMaterial(id, variantId, pitchOverride) {
  const base = getMaterial(id);
  const variant = base.variants
    ? base.variants.find((v) => v.id === variantId) || base.variants[0]
    : null;

  const merged = { ...base, ...(variant || {}) };
  merged.id = base.id;
  merged.name = base.name;
  merged.short = base.short;
  merged.variantShort = variant ? variant.short : null;
  merged.variants = base.variants || null;
  merged.variantId = variant ? variant.id : null;
  merged.variantName = variant ? variant.name : null;
  merged.hint = variant ? variant.hint : base.hint || '';
  if (pitchOverride) merged.pitch = pitchOverride;
  merged.cellAspect = merged.pitch.w / merged.pitch.h;
  return merged;
}
