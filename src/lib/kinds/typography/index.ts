import { defineKind, type Kind } from '../types';
import { TypographyRenderer, type TypographyCandidate, type TypographyContext } from './renderer';
import { tryGetFont } from './fonts';

const kind: Kind<TypographyCandidate, TypographyContext> = {
  id: 'typography',
  displayName: 'Typography',
  candidateSchemaRef: '#/$defs/candidate_typography',
  Renderer: TypographyRenderer,
  summarize: (c) => {
    const serif = tryGetFont(c.serif)?.name ?? c.serif;
    const sans = tryGetFont(c.sans)?.name ?? c.sans;
    return `${serif} + ${sans}`;
  },
};

export const typographyKind = defineKind(kind);
export { TypographyRenderer } from './renderer';
export type { TypographyCandidate, TypographyContext } from './renderer';
export { SERIFS, SANS, FONTS_BY_ID, getFont, tryGetFont } from './fonts';
export type { FontDef } from './fonts';
export { CONTENT, getContent } from './content';
export type { ContentTemplate } from './content';
