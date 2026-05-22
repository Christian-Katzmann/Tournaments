import type { CandidateBase, KindRendererProps } from '../types';

/**
 * FREEFORM RENDERER — SECURITY NOTES (READ BEFORE EDITING)
 *
 * This kind exists as an escape hatch. The author hands us raw HTML and we
 * render it. That is intrinsically dangerous — we mitigate by isolating the
 * HTML inside a sandboxed <iframe> with srcdoc.
 *
 * The sandbox attribute below is the EMPTY string. That is intentional and
 * load-bearing: an empty sandbox attribute applies ALL restrictions. In
 * particular it:
 *   - Disables JavaScript execution (<script>, on* handlers, javascript: URLs).
 *   - Forces the document's origin to be opaque ("null") — so embedded code,
 *     even if it somehow ran, could not touch parent localStorage, cookies,
 *     or the parent's DOM.
 *   - Blocks form submission, popups, top-frame navigation, plugins, and
 *     pointer lock / orientation lock / autoplay.
 *
 * We do NOT add `allow-same-origin`. Doing so re-grants the iframe the
 * parent's origin, which would let any (now-script-blocked) inline code that
 * leaks back in via a future regression read parent storage. Subresource
 * fetches like <img src="http://localhost:4278/..."> still work without
 * allow-same-origin, because <img> loading is not gated by same-origin policy
 * for the iframe document. That is the use case the open question called out;
 * an empty sandbox is sufficient for it.
 *
 * We do NOT add `allow-scripts`. Ever. If you find yourself wanting to run
 * JS in a candidate preview, that is a separate kind, not freeform.
 *
 * Trust model: candidates are author-supplied local content, but we still
 * sandbox aggressively because (a) we may load tournaments authored by other
 * humans or agents, and (b) an unsandboxed iframe could read this app's
 * localStorage / window globals.
 *
 * If a renderer-level concern (e.g., a candidate referencing a remote
 * tracking pixel) appears, the right move is a more restrictive Content-
 * Security-Policy meta tag injected into srcDoc, not loosening the sandbox.
 */

export interface FreeformCandidate extends CandidateBase {
  html: string;
}

export interface FreeformContext {
  height?: string;
  background?: string;
}

const FRAME_CSP =
  // Defense-in-depth: even inside the sandbox, deny script execution by CSP.
  // 'none' for script-src means inline scripts and src'd scripts both fail
  // even before the browser's sandbox check.
  `<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: http://localhost:4278; img-src * data:; style-src 'unsafe-inline' 'self'; script-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'">`;

function buildSrcDoc(html: string, background: string): string {
  return `<!doctype html><html><head>${FRAME_CSP}<meta charset="utf-8"><style>html,body{margin:0;padding:16px;background:${background};color:#111;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;font-size:14px;line-height:1.55;}img{max-width:100%;height:auto;}</style></head><body>${html}</body></html>`;
}

export function FreeformRenderer({
  candidate,
  context,
}: KindRendererProps<FreeformCandidate, FreeformContext>) {
  const height = context?.height ?? '320px';
  const background = context?.background ?? '#ffffff';

  return (
    <div className="w-full max-w-[680px]">
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
        freeform · sandboxed
      </div>

      <iframe
        title={candidate.label}
        // EMPTY sandbox = all restrictions enabled. See file header.
        sandbox=""
        srcDoc={buildSrcDoc(candidate.html, background)}
        // referrerpolicy belt-and-suspenders even though sandbox already
        // restricts navigation.
        referrerPolicy="no-referrer"
        loading="lazy"
        style={{
          width: '100%',
          height,
          border: '1px solid var(--border)',
          borderRadius: 8,
          background,
          display: 'block',
        }}
      />
    </div>
  );
}
