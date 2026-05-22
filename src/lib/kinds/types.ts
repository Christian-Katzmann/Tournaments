import type { ComponentType } from 'react';

export interface CandidateBase {
  id: string;
  label: string;
}

export type KindId =
  | 'typography'
  | 'color'
  | 'copy'
  | 'images'
  | 'code'
  | 'markdown'
  | 'ai-output'
  | 'freeform';

export interface KindRendererProps<C extends CandidateBase = CandidateBase, Ctx = unknown> {
  candidate: C;
  context?: Ctx;
}

export interface Kind<C extends CandidateBase = CandidateBase, Ctx = unknown> {
  id: KindId;
  displayName: string;
  candidateSchemaRef: string;
  Renderer: ComponentType<KindRendererProps<C, Ctx>>;
  summarize: (candidate: C) => string;
}

export type AnyKind = Kind<CandidateBase, unknown>;

export function defineKind<C extends CandidateBase, Ctx>(kind: Kind<C, Ctx>): AnyKind {
  return kind as unknown as AnyKind;
}
