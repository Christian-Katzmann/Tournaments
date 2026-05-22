import { defineKind, type Kind } from '../types';
import { AiOutputRenderer, type AiOutputCandidate, type AiOutputContext } from './renderer';

const kind: Kind<AiOutputCandidate, AiOutputContext> = {
  id: 'ai-output',
  displayName: 'AI output',
  candidateSchemaRef: '#/$defs/candidate_ai_output',
  Renderer: AiOutputRenderer,
  summarize: (c) => {
    const head = c.response.replace(/\s+/g, ' ').trim();
    const prefix = c.model ? `${c.model} · ` : '';
    const tail = head.length > 64 ? `${head.slice(0, 63)}…` : head;
    return `${prefix}${tail}`;
  },
};

export const aiOutputKind = defineKind(kind);
export { AiOutputRenderer } from './renderer';
export type { AiOutputCandidate, AiOutputContext } from './renderer';
