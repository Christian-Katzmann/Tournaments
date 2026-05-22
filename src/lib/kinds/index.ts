export type { CandidateBase, KindId, Kind, KindRendererProps, AnyKind } from './types';
export { defineKind } from './types';
export { getKind, hasKind, allKinds } from './registry';

export { typographyKind } from './typography';
export type {
  TypographyCandidate,
  TypographyContext,
  FontDef,
  ContentTemplate,
} from './typography';

export { colorKind, pickReadableTextColor } from './color';
export type { ColorCandidate } from './color';

export { copyKind } from './copy';
export type { CopyCandidate, CopyContext, CopyRole } from './copy';

export { imagesKind } from './images';
export type { ImagesCandidate, ImagesContext } from './images';

export { codeKind } from './code';
export type { CodeCandidate, CodeContext } from './code';

export { markdownKind } from './markdown';
export type { MarkdownCandidate, MarkdownContext } from './markdown';

export { aiOutputKind } from './ai-output';
export type { AiOutputCandidate, AiOutputContext } from './ai-output';

export { freeformKind } from './freeform';
export type { FreeformCandidate, FreeformContext } from './freeform';
