// Materialdefinisjoner: hvordan rutenettet ser ut, hvilken palett som brukes,
// og hvilke størrelser som er praktiske å bygge.
//
// `pitch` er omtrentlig fysisk størrelse per brikke og brukes bare til å vise
// hvor stort det ferdige bildet blir. Verdiene kan overstyres i appen.

export const MATERIALS = [
  {
    id: 'perler',
    name: 'Strykeperler',
    short: 'Perler',
    icon: 'bead',
    description: 'Hama / Perler / Nabbi midi-perler på perlebrett.',
    palette: 'hama-midi',
    grid: 'square',
    cellAspect: 1,
    lockAspect: true,
    style: 'bead',
    unit: 'perle',
    unitPlural: 'perler',
    pitch: { w: 5, h: 5 },
    presets: [
      { name: '1 brett – 29 × 29', w: 29, h: 29 },
      { name: '2 brett bredt – 58 × 29', w: 58, h: 29 },
      { name: '4 brett – 58 × 58', w: 58, h: 58 },
      { name: '9 brett – 87 × 87', w: 87, h: 87 },
      { name: 'Lite motiv – 20 × 20', w: 20, h: 20 },
    ],
    tips: [
      'Et vanlig kvadratisk perlebrett er 29 × 29 pinner. Større motiv bygges ved å legge flere brett inntil hverandre.',
      'Legg bakepapir over før du stryker, og stryk begge sider hvis motivet skal tåle håndtering.',
      'Motiv med tomme ruter kan falle fra hverandre – sørg for at alle perler henger sammen.',
    ],
  },
  {
    id: 'lego',
    name: 'LEGO',
    short: 'LEGO',
    icon: 'stud',
    description: '1 × 1 plater på byggeplate – klassisk klossmosaikk.',
    palette: 'lego',
    grid: 'square',
    cellAspect: 1,
    lockAspect: true,
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
      'Bruk 1 × 1 plater (del 3024). Ligger flere like farger på rad kan de erstattes med 1 × 2, 1 × 3 eller 1 × 4 plater – det holder bedre sammen og blir billigere.',
      'En standard byggeplate er 32 × 32 knotter. Skal du ha flere plater ved siden av hverandre, bind dem sammen på baksiden.',
      'Henger bildet på veggen? Bygg et lag plater i bunn før mosaikken, så sitter brikkene bedre.',
    ],
  },
  {
    id: 'plusplus',
    name: 'Plus-Plus',
    short: 'Plus-Plus',
    icon: 'plus',
    description: 'Plus-Plus-brikker lagt flatt i forskjøvede rader.',
    palette: 'plusplus',
    grid: 'offset',
    // Radene ligger en halv brikkehøyde fra hverandre og forskyves annenhver
    // gang en halv brikke sidelengs – det er slik brikkene låser i hverandre.
    cellAspect: 2,
    lockAspect: false,
    style: 'plus',
    unit: 'brikke',
    unitPlural: 'brikker',
    pitch: { w: 20, h: 10 },
    presets: [
      { name: 'Lite – 16 brikker bredt', w: 16, h: 32 },
      { name: 'Mellom – 24 brikker bredt', w: 24, h: 48 },
      { name: 'Stort – 32 brikker bredt', w: 32, h: 64 },
      { name: 'Ekstra stort – 48 brikker bredt', w: 48, h: 96 },
    ],
    tips: [
      'Brikkene låser i hverandre: annenhver rad er forskjøvet en halv brikke, og radene ligger en halv brikkehøyde fra hverandre. Derfor er radtallet omtrent dobbelt så høyt som kolonnetallet for et kvadratisk motiv.',
      'Legger du brikkene annerledes, endres forholdet mellom bredde og høyde. Bygg en testflate på 4 × 4 brikker, mål den, og juster «brikkeform» under Størrelse til bildet ikke blir strukket.',
      'Bygg nedenfra og opp, rad for rad – da ser du fort om en rad har kommet ut av takt.',
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
    cellAspect: 1,
    lockAspect: false,
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
