import { defineKind, type Kind } from '../types';
import { ColorRenderer, type ColorCandidate } from './renderer';

const kind: Kind<ColorCandidate> = {
  id: 'color',
  displayName: 'Color',
  candidateSchemaRef: '#/$defs/candidate_color',
  Renderer: ColorRenderer,
  summarize: (c) => (c.name ? `${c.name} · ${c.hex}` : c.hex),
};

export const colorKind = defineKind(kind);
export { ColorRenderer, pickReadableTextColor } from './renderer';
export type { ColorCandidate } from './renderer';
