import type { AnyKind, KindId } from './types';
import { typographyKind } from './typography';
import { colorKind } from './color';
import { copyKind } from './copy';
import { imagesKind } from './images';
import { codeKind } from './code';
import { markdownKind } from './markdown';
import { aiOutputKind } from './ai-output';
import { freeformKind } from './freeform';

const KINDS: Map<KindId, AnyKind> = new Map();

function register(kind: AnyKind): void {
  if (KINDS.has(kind.id)) {
    throw new Error(`Kind already registered: ${kind.id}`);
  }
  KINDS.set(kind.id, kind);
}

register(typographyKind);
register(colorKind);
register(copyKind);
register(imagesKind);
register(codeKind);
register(markdownKind);
register(aiOutputKind);
register(freeformKind);

export function getKind(id: KindId): AnyKind {
  const kind = KINDS.get(id);
  if (!kind) throw new Error(`Unknown kind: ${id}`);
  return kind;
}

export function hasKind(id: string): id is KindId {
  return KINDS.has(id as KindId);
}

export function allKinds(): AnyKind[] {
  return Array.from(KINDS.values());
}
