import { defineKind, type Kind } from '../types';
import { MarkdownRenderer, type MarkdownCandidate, type MarkdownContext } from './renderer';

const kind: Kind<MarkdownCandidate, MarkdownContext> = {
  id: 'markdown',
  displayName: 'Markdown',
  candidateSchemaRef: '#/$defs/candidate_markdown',
  Renderer: MarkdownRenderer,
  summarize: (c) => {
    const firstLine = c.markdown.split('\n').find((l) => l.trim().length > 0) ?? '';
    const stripped = firstLine.replace(/^#+\s*/, '').trim();
    return stripped.length > 72 ? `${stripped.slice(0, 71)}…` : stripped || '(empty)';
  },
};

export const markdownKind = defineKind(kind);
export { MarkdownRenderer } from './renderer';
export type { MarkdownCandidate, MarkdownContext } from './renderer';
