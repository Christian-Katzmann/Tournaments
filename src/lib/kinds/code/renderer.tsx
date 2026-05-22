import { useMemo } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import markdownLang from 'highlight.js/lib/languages/markdown';
import type { CandidateBase, KindRendererProps } from '../types';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('jsx', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('tsx', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('zsh', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('rs', rust);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('markdown', markdownLang);
hljs.registerLanguage('md', markdownLang);

export interface CodeCandidate extends CandidateBase {
  language: string;
  code: string;
}

export interface CodeContext {
  showLanguage?: boolean;
  maxHeight?: string;
}

const MONO_STACK =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export function CodeRenderer({ candidate, context }: KindRendererProps<CodeCandidate, CodeContext>) {
  const lang = (candidate.language || '').toLowerCase().trim();
  const showLanguage = context?.showLanguage ?? true;
  const maxHeight = context?.maxHeight ?? '420px';

  const highlighted = useMemo(() => {
    if (!lang || !hljs.getLanguage(lang)) return null;
    try {
      return hljs.highlight(candidate.code, { language: lang, ignoreIllegals: true }).value;
    } catch {
      return null;
    }
  }, [candidate.code, lang]);

  return (
    <div className="w-full max-w-[680px]">
      {showLanguage ? (
        <div
          style={{
            fontFamily: 'var(--font-system)',
            color: 'var(--text-muted)',
            fontWeight: 600,
            letterSpacing: '0.08em',
            fontSize: '11px',
          }}
          className="uppercase mb-3"
        >
          {lang || 'plaintext'}
        </div>
      ) : null}

      <pre
        style={{
          fontFamily: MONO_STACK,
          background: 'var(--bg)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '16px 18px',
          fontSize: '13.5px',
          lineHeight: 1.55,
          overflow: 'auto',
          maxHeight,
          margin: 0,
          whiteSpace: 'pre',
        }}
      >
        {highlighted ? (
          <code
            className={`hljs language-${lang}`}
            // Safe: highlight.js produces only its own <span> markup from a JS string source.
            // Input is the candidate.code string; no user-supplied HTML is interpolated.
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        ) : (
          <code className={`hljs language-${lang || 'plaintext'}`}>{candidate.code}</code>
        )}
      </pre>
    </div>
  );
}
