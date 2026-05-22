import { defineKind, type Kind } from '../types';
import { FreeformRenderer, type FreeformCandidate, type FreeformContext } from './renderer';

const kind: Kind<FreeformCandidate, FreeformContext> = {
  id: 'freeform',
  displayName: 'Freeform',
  candidateSchemaRef: '#/$defs/candidate_freeform',
  Renderer: FreeformRenderer,
  summarize: (c) => {
    const len = c.html.length;
    return `${len} char${len === 1 ? '' : 's'} of html`;
  },
};

export const freeformKind = defineKind(kind);
export { FreeformRenderer } from './renderer';
export type { FreeformCandidate, FreeformContext } from './renderer';
