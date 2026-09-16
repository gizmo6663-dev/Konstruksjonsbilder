// Fargepaletter for de ulike materialene.
//
// MERK: hex-verdiene er tilnærminger laget for skjermvisning. Ekte perler og
// klosser har pigmenter som ikke lar seg gjengi eksakt på en skjerm, og fargene
// varierer mellom produksjonspartier. Bruk dem som veiledning, ikke som fasit.
// Farger er gruppert slik at man kan skru av sett man ikke eier.

export const PALETTES = {
  'hama-midi': {
    id: 'hama-midi',
    name: 'Strykeperler – midi',
    note: 'Fargenumre følger Hama sin nummerering. Perler fra andre merker (Perler, Nabbi, Artkal) har egne numre, men ligger nær de samme fargene.',
    groups: [
      {
        id: 'standard',
        name: 'Standard',
        defaultOn: true,
        colors: [
          { code: '01', name: 'Hvit', hex: '#ffffff' },
          { code: '02', name: 'Krem', hex: '#f5e7c6' },
          { code: '03', name: 'Gul', hex: '#f8d200' },
          { code: '04', name: 'Oransje', hex: '#f57c1f' },
          { code: '05', name: 'Rød', hex: '#d8232a' },
          { code: '06', name: 'Rosa', hex: '#ee6f9c' },
          { code: '07', name: 'Lilla', hex: '#6f3b8e' },
          { code: '08', name: 'Blå', hex: '#1a52a0' },
          { code: '09', name: 'Lys blå', hex: '#63bfe4' },
          { code: '10', name: 'Grønn', hex: '#00913f' },
          { code: '11', name: 'Lys grønn', hex: '#8cc63e' },
          { code: '12', name: 'Brun', hex: '#6a4126' },
          { code: '13', name: 'Grå', hex: '#8d8d8d' },
          { code: '17', name: 'Turkis', hex: '#00a99d' },
          { code: '18', name: 'Svart', hex: '#1b1b1b' },
          { code: '20', name: 'Lys rosa', hex: '#f7b3c2' },
          { code: '21', name: 'Beige', hex: '#e2c49a' },
          { code: '22', name: 'Lys brun', hex: '#a9744f' },
          { code: '26', name: 'Hudfarge', hex: '#ffd2b0' },
          { code: '27', name: 'Lys grå', hex: '#c7c7c7' },
          { code: '28', name: 'Mørk grønn', hex: '#046c3d' },
          { code: '29', name: 'Lys gul', hex: '#fbec8a' },
          { code: '30', name: 'Vinrød', hex: '#7c1f2b' },
          { code: '31', name: 'Mørk grå', hex: '#4d4d4d' },
          { code: '37', name: 'Cerise', hex: '#e0407b' },
          { code: '38', name: 'Mørk blå', hex: '#17305e' },
          { code: '60', name: 'Lys turkis', hex: '#7fd8d2' },
          { code: '75', name: 'Kobber', hex: '#b07a4a' },
        ],
      },
      {
        id: 'pastell',
        name: 'Pastell',
        defaultOn: false,
        colors: [
          { code: '32', name: 'Pastellblå', hex: '#a9cde8' },
          { code: '33', name: 'Pastellgrønn', hex: '#b6e0a6' },
          { code: '34', name: 'Pastellgul', hex: '#fdf0a6' },
          { code: '35', name: 'Pastellilla', hex: '#c6b2d6' },
          { code: '36', name: 'Pastellrosa', hex: '#f8c6d6' },
          { code: '95', name: 'Pastellfiolett', hex: '#b8a6d9' },
        ],
      },
      {
        id: 'neon',
        name: 'Neon',
        defaultOn: false,
        colors: [
          { code: '43', name: 'Neongrønn', hex: '#a8e600' },
          { code: '44', name: 'Neongul', hex: '#f2ea00' },
          { code: '45', name: 'Neonoransje', hex: '#ff8a00' },
          { code: '46', name: 'Neonrød', hex: '#ff3b30' },
          { code: '47', name: 'Neonrosa', hex: '#ff5fa2' },
          { code: '48', name: 'Neonlilla', hex: '#a44bff' },
        ],
      },
    ],
  },

  lego: {
    id: 'lego',
    name: 'LEGO – vanlige klossfarger',
    note: 'Navnene følger BrickLink. Grunnfargene dekker hele fargesirkelen, så motivet ikke bommer på fargetonen. Ikke alle farger finnes i alle deler – sjekk før du handler. 1×1 plater (del 3024) er den vanligste brikken til mosaikk.',
    groups: [
      {
        id: 'grunn',
        name: 'Grunnfarger',
        defaultOn: true,
        colors: [
          { code: '1', name: 'White', hex: '#f2f3f2' },
          { code: '86', name: 'Light Bluish Gray', hex: '#a0a5a9' },
          { code: '85', name: 'Dark Bluish Gray', hex: '#6c6e68' },
          { code: '11', name: 'Black', hex: '#1b2a34' },
          { code: '5', name: 'Red', hex: '#c91a09' },
          { code: '59', name: 'Dark Red', hex: '#720e0f' },
          { code: '4', name: 'Orange', hex: '#fe8a18' },
          { code: '110', name: 'Bright Light Orange', hex: '#f8bb3d' },
          { code: '3', name: 'Yellow', hex: '#f2cd37' },
          { code: '103', name: 'Bright Light Yellow', hex: '#fff03a' },
          { code: '2', name: 'Tan', hex: '#e4cd9e' },
          { code: '69', name: 'Dark Tan', hex: '#958a73' },
          { code: '88', name: 'Reddish Brown', hex: '#582a12' },
          { code: '6', name: 'Green', hex: '#237841' },
          { code: '36', name: 'Bright Green', hex: '#4b9f4a' },
          { code: '80', name: 'Dark Green', hex: '#184632' },
          { code: '34', name: 'Lime', hex: '#bbe90b' },
          { code: '7', name: 'Blue', hex: '#0055bf' },
          { code: '63', name: 'Dark Blue', hex: '#0a3463' },
          { code: '42', name: 'Medium Blue', hex: '#5a93db' },
          { code: '105', name: 'Bright Light Blue', hex: '#9fc3e9' },
          { code: '153', name: 'Dark Azure', hex: '#078bc9' },
          { code: '90', name: 'Nougat', hex: '#d09168' },
          { code: '150', name: 'Medium Nougat', hex: '#aa7d55' },
          { code: '24', name: 'Purple', hex: '#81007b' },
          { code: '89', name: 'Dark Purple', hex: '#3f3691' },
          { code: '157', name: 'Medium Lavender', hex: '#a06eb9' },
          { code: '154', name: 'Lavender', hex: '#cda4de' },
          { code: '71', name: 'Magenta', hex: '#923978' },
          { code: '47', name: 'Dark Pink', hex: '#c870a0' },
          { code: '104', name: 'Bright Pink', hex: '#e4adc8' },
          { code: '39', name: 'Dark Turquoise', hex: '#008f9b' },
          { code: '156', name: 'Medium Azure', hex: '#36aebf' },
        ],
      },
      {
        id: 'utvidet',
        name: 'Utvidet utvalg',
        defaultOn: false,
        colors: [
          { code: '68', name: 'Dark Orange', hex: '#a95500' },
          { code: '120', name: 'Dark Brown', hex: '#352100' },
          { code: '155', name: 'Olive Green', hex: '#9b9a5a' },
          { code: '48', name: 'Sand Green', hex: '#a0bcac' },
          { code: '55', name: 'Sand Blue', hex: '#6074a1' },
          { code: '220', name: 'Coral', hex: '#fc5c5d' },
          { code: '90', name: 'Light Nougat', hex: '#f6d7b3' },
          { code: '158', name: 'Yellowish Green', hex: '#dfeea5' },
          { code: '61', name: 'Sand Red', hex: '#d67572' },
        ],
      },
    ],
  },

  plusplus: {
    id: 'plusplus',
    name: 'Plus-Plus',
    note: 'Fargene følger de vanlige Plus-Plus-settene (Basic, Pastell, Neon). Skru av settene du ikke har.',
    groups: [
      {
        id: 'basic',
        name: 'Basic',
        defaultOn: true,
        colors: [
          { code: 'B1', name: 'Rød', hex: '#e2222b' },
          { code: 'B2', name: 'Oransje', hex: '#f47b20' },
          { code: 'B3', name: 'Gul', hex: '#ffd400' },
          { code: 'B4', name: 'Grønn', hex: '#00a651' },
          { code: 'B5', name: 'Lysegrønn', hex: '#8dc63f' },
          { code: 'B6', name: 'Blå', hex: '#0057b8' },
          { code: 'B7', name: 'Lyseblå', hex: '#29abe2' },
          { code: 'B8', name: 'Lilla', hex: '#7b2e8e' },
          { code: 'B9', name: 'Rosa', hex: '#ec4d9c' },
          { code: 'B10', name: 'Brun', hex: '#7b4b2a' },
          { code: 'B11', name: 'Hvit', hex: '#ffffff' },
          { code: 'B12', name: 'Svart', hex: '#1c1c1c' },
          { code: 'B13', name: 'Grå', hex: '#9a9a9a' },
        ],
      },
      {
        id: 'pastell',
        name: 'Pastell',
        defaultOn: false,
        colors: [
          { code: 'P1', name: 'Pastellrosa', hex: '#f7c5d8' },
          { code: 'P2', name: 'Pastellgul', hex: '#fbe8a6' },
          { code: 'P3', name: 'Pastellgrønn', hex: '#bfe3c0' },
          { code: 'P4', name: 'Pastellblå', hex: '#b9dcf2' },
          { code: 'P5', name: 'Pastellilla', hex: '#cfc0e8' },
          { code: 'P6', name: 'Pastelloransje', hex: '#fbd0ae' },
          { code: 'P7', name: 'Mint', hex: '#a8e6cf' },
        ],
      },
      {
        id: 'neon',
        name: 'Neon',
        defaultOn: false,
        colors: [
          { code: 'N1', name: 'Neongrønn', hex: '#aaff00' },
          { code: 'N2', name: 'Neongul', hex: '#fbff00' },
          { code: 'N3', name: 'Neonoransje', hex: '#ff6d00' },
          { code: 'N4', name: 'Neonrosa', hex: '#ff2e8b' },
          { code: 'N5', name: 'Neonblå', hex: '#00e5ff' },
        ],
      },
    ],
  },

  generisk: {
    id: 'generisk',
    name: 'Egendefinert',
    note: 'Legg inn dine egne farger. Nyttig for andre perlemerker, mosaikkfliser, strikkediagram eller det du måtte finne på.',
    editable: true,
    groups: [
      {
        id: 'egne',
        name: 'Egne farger',
        defaultOn: true,
        colors: [
          { code: '1', name: 'Hvit', hex: '#ffffff' },
          { code: '2', name: 'Lys grå', hex: '#c8c8c8' },
          { code: '3', name: 'Mørk grå', hex: '#5a5a5a' },
          { code: '4', name: 'Svart', hex: '#000000' },
          { code: '5', name: 'Rød', hex: '#d32f2f' },
          { code: '6', name: 'Oransje', hex: '#f57c00' },
          { code: '7', name: 'Gul', hex: '#fbc02d' },
          { code: '8', name: 'Grønn', hex: '#388e3c' },
          { code: '9', name: 'Turkis', hex: '#00897b' },
          { code: '10', name: 'Blå', hex: '#1976d2' },
          { code: '11', name: 'Lilla', hex: '#7b1fa2' },
          { code: '12', name: 'Rosa', hex: '#ec407a' },
          { code: '13', name: 'Brun', hex: '#6d4c41' },
          { code: '14', name: 'Beige', hex: '#d7ccc8' },
        ],
      },
    ],
  },
};

/** Alle farger i en palett, flatet ut, med gruppe-id på hver farge. */
export function flattenPalette(paletteId) {
  const p = PALETTES[paletteId];
  const out = [];
  for (const g of p.groups) {
    for (const c of g.colors) out.push({ ...c, group: g.id, key: `${p.id}:${g.id}:${c.code}:${c.hex}` });
  }
  return out;
}

export function defaultEnabledGroups(paletteId) {
  return PALETTES[paletteId].groups.filter((g) => g.defaultOn).map((g) => g.id);
}
