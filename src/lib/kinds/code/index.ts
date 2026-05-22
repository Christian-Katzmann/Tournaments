import { defineKind, type Kind } from '../types';
import { CodeRenderer, type CodeCandidate, type CodeContext } from './renderer';

const kind: Kind<CodeCandidate, CodeContext> = {
  id: 'code',
  displayName: 'Code',
  candidateSchemaRef: '#/$defs/candidate_code',
  Renderer: CodeRenderer,
  summarize: (c) => {
    const lines = c.code.split('\n').length;
    return `${c.language} · ${lines} line${lines === 1 ? '' : 's'}`;
  },
};

export const codeKind = defineKind(kind);
export { CodeRenderer } from './renderer';
export type { CodeCandidate, CodeContext } from './renderer';
