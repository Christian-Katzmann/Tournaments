export interface FontDef {
  id: string;
  name: string;
  family: string;
  type: 'serif' | 'sans';
}

export const SERIFS: FontDef[] = [
  { id: 'newsreader', name: 'Newsreader', family: '"Newsreader", serif', type: 'serif' },
  { id: 'faustina', name: 'Faustina', family: '"Faustina", serif', type: 'serif' },
  { id: 'source-serif-4', name: 'Source Serif 4', family: '"Source Serif 4", serif', type: 'serif' },
  { id: 'lora', name: 'Lora', family: '"Lora", serif', type: 'serif' },
  { id: 'alegreya', name: 'Alegreya', family: '"Alegreya", serif', type: 'serif' },
  { id: 'ibm-plex-serif', name: 'IBM Plex Serif', family: '"IBM Plex Serif", serif', type: 'serif' },
];

export const SANS: FontDef[] = [
  { id: 'hanken-grotesk', name: 'Hanken Grotesk', family: '"Hanken Grotesk", sans-serif', type: 'sans' },
  { id: 'inter', name: 'Inter', family: '"Inter", sans-serif', type: 'sans' },
  { id: 'geist', name: 'Geist', family: '"Geist", sans-serif', type: 'sans' },
  { id: 'work-sans', name: 'Work Sans', family: '"Work Sans", sans-serif', type: 'sans' },
  { id: 'mulish', name: 'Mulish', family: '"Mulish", sans-serif', type: 'sans' },
  { id: 'lato', name: 'Lato', family: '"Lato", sans-serif', type: 'sans' },
  { id: 'ibm-plex-sans', name: 'IBM Plex Sans', family: '"IBM Plex Sans", sans-serif', type: 'sans' },
  { id: 'public-sans', name: 'Public Sans', family: '"Public Sans", sans-serif', type: 'sans' },
];

export const FONTS_BY_ID: Record<string, FontDef> = Object.fromEntries(
  [...SERIFS, ...SANS].map((f) => [f.id, f])
);

export function getFont(id: string): FontDef {
  const font = FONTS_BY_ID[id];
  if (!font) throw new Error(`Unknown font id: ${id}`);
  return font;
}

export function tryGetFont(id: string): FontDef | undefined {
  return FONTS_BY_ID[id];
}
