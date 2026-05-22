export interface ContentTemplate {
  label: string;
  hero: string;
  headline: string;
  body: string;
  attribution: string;
}

export const CONTENT: ContentTemplate[] = [
  {
    label: 'BESKÆFTIGELSESFREKVENS · 16–66 ÅR',
    hero: '73,8%',
    headline: 'Beskæftigelsesfrekvensen i Hjørring nåede 73,8% — højeste niveau siden 2019',
    body: 'Modsat den nationale trend, som falder. Stigningen er koncentreret i aldersgruppen 50–59, særligt blandt borgere uden erhvervsuddannelse. Tre nabokommuner med lignende demografi viser samme mønster.',
    attribution: 'Kilde: Jobindsats.dk / STAR · Opdateret 2026-05-17',
  },
  {
    label: 'LANGTIDSLEDIGE · Q1 2026',
    hero: '12,3%',
    headline: 'Langtidsledigheden i Lolland steg 12,3% i Q1 2026',
    body: 'Stigningen følger den nationale trend men er mere udtalt her. Særligt mærkbart i offentlig administration og social- og sundhedssektoren. Sammenlignelige kommuner ser tilsvarende udvikling.',
    attribution: 'Kilde: STAR · Q1 2026 (foreløbige tal)',
  },
  {
    label: 'SYGEDAGPENGE · NYE SAGER',
    hero: '4.872',
    headline: 'Sygedagpenge i hovedstadsområdet: 4.872 nye sager i Q1',
    body: 'Tallet er det højeste siden 2019 og repræsenterer en stigning på 4,2 procentpoint over fem år. Drevet primært af øget beskæftigelse blandt kvinder i aldersgruppen 30–49.',
    attribution: 'Kilde: Danmarks Statistik / Jobindsats.dk · Marts 2026',
  },
  {
    label: 'JOBTRÆNING · UNDER 30 ÅR',
    hero: '+8,4%',
    headline: 'Unge under 30 i jobtræning: stigning på 8,4% i 2026',
    body: 'Den højeste stigning siden ordningens udvidelse i 2023. Effekten er størst i kommuner med lokale praktikaftaler. Aalborg, Aarhus og Esbjerg står for over halvdelen af stigningen.',
    attribution: 'Kilde: STAR · Q1 2026',
  },
  {
    label: 'A-DAGPENGE · TILMELDTE',
    hero: '−2,1%',
    headline: 'A-dagpenge i Aalborg falder for tredje måned i træk',
    body: 'Faldet på 2,1% følger den positive udvikling på det lokale arbejdsmarked. Industri og bygge- og anlægssektoren tegner sig for hovedparten af genplaceringerne. Trenden ses også i Randers og Vejle.',
    attribution: 'Kilde: Jobindsats.dk · April 2026',
  },
  {
    label: 'SELVFORSØRGELSE · 3 ÅR EFTER',
    hero: '47,3%',
    headline: 'Selvforsørgelse blandt nytilkomne: 47,3% efter 3 år',
    body: 'Andelen er højere end landsgennemsnittet på 42,8%. Forskellen forklares primært af stærkere lokal integration og hurtigere sprogtilbud. Effekten holder også efter justering for uddannelsesbaggrund.',
    attribution: 'Kilde: Danmarks Statistik · 2026-Q1',
  },
];

export function getContent(index: number): ContentTemplate {
  return CONTENT[index % CONTENT.length];
}
