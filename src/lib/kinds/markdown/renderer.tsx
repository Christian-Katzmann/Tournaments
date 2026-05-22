import { useMemo } from 'react';
import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import type { CandidateBase, KindRendererProps } from '../types';

export interface MarkdownCandidate extends CandidateBase {
  markdown: string;
}

export interface MarkdownContext {
  maxHeight?: string;
}

const marker = new Marked({
  gfm: true,
  breaks: false,
  // Critical: do NOT pass through inline HTML. Marked emits the HTML it parses
  // (including any embedded <script>, <iframe>, etc. blocks the author wrote);
  // DOMPurify strips those after parsing, but disabling pass-through is belt-and-suspenders.
});

function renderMarkdown(md: string): string {
  const rawHtml = marker.parse(md, { async: false }) as string;
  // DOMPurify default profile already drops <script>, on* handlers, javascript: URLs,
  // <iframe>, <object>, <embed>, <form>, and unknown protocols. We don't loosen it.
  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus'],
  });
}

export function MarkdownRenderer({
  candidate,
  context,
}: KindRendererProps<MarkdownCandidate, MarkdownContext>) {
  const maxHeight = context?.maxHeight ?? '520px';
  const html = useMemo(() => renderMarkdown(candidate.markdown), [candidate.markdown]);

  return (
    <div className="w-full max-w-[680px]">
      <div
        className="tournaments-markdown"
        style={{
          fontFamily: 'var(--font-system)',
          color: 'var(--text)',
          fontSize: '15px',
          lineHeight: 1.6,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '20px 24px',
          overflow: 'auto',
          maxHeight,
        }}
        // Safe: html is the output of DOMPurify.sanitize() on a marked-rendered string.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
