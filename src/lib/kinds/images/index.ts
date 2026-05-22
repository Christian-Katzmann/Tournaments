import { defineKind, type Kind } from '../types';
import { ImagesRenderer, type ImagesCandidate, type ImagesContext } from './renderer';

const kind: Kind<ImagesCandidate, ImagesContext> = {
  id: 'images',
  displayName: 'Images',
  candidateSchemaRef: '#/$defs/candidate_images',
  Renderer: ImagesRenderer,
  summarize: (c) => {
    try {
      const url = new URL(c.src, 'http://x/');
      const last = url.pathname.split('/').filter(Boolean).pop();
      return last ?? c.src;
    } catch {
      return c.src;
    }
  },
};

export const imagesKind = defineKind(kind);
export { ImagesRenderer } from './renderer';
export type { ImagesCandidate, ImagesContext } from './renderer';
