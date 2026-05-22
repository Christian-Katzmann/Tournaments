import { getKind } from '../lib/kinds/registry';
import type { CandidateBase, KindId } from '../lib/kinds/types';

interface Props {
  kind: KindId;
  candidate: CandidateBase;
  context?: unknown;
}

export function KindRenderer({ kind, candidate, context }: Props) {
  const Renderer = getKind(kind).Renderer;
  return <Renderer candidate={candidate} context={context} />;
}
