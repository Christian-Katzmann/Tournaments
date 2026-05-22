import { defineKind, type Kind } from '../types';
import { CopyRenderer, type CopyCandidate, type CopyContext } from './renderer';

const kind: Kind<CopyCandidate, CopyContext> = {
  id: 'copy',
  displayName: 'Copy',
  candidateSchemaRef: '#/$defs/candidate_copy',
  Renderer: CopyRenderer,
  summarize: (c) => {
    const t = c.text.replace(/\s+/g, ' ').trim();
    return t.length > 72 ? `${t.slice(0, 71)}…` : t;
  },
};

export const copyKind = defineKind(kind);
export { CopyRenderer } from './renderer';
export type { CopyCandidate, CopyContext, CopyRole } from './renderer';
