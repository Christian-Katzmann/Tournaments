# Kinds

A *kind* is what one candidate looks like. Each kind owns its candidate shape,
its renderer, and its display summarizer. The eight kinds at launch are closed
(extensible later by adding a folder under `src/lib/kinds/`).

## typography

A font pairing — one serif id and one sans id from the registry at
`src/lib/kinds/typography/fonts.ts`. The renderer shows a real piece of Danish
content (employment statistics from `content.ts`) with the serif as headline /
hero and the sans as body. Comparing pairings tells you which combination
*feels* right at content scale, not how the fonts look in isolation.

## color

A single hex color, optionally named. Renderer shows a large swatch with the
hex and the name. Sample text auto-contrasts (black or white) so the swatch
also reads as a usable backdrop.

## copy

A piece of written copy — headline, paragraph, or call-to-action. Renderer
places the text on a neutral canvas with typography that intentionally does
not compete (one neutral sans, fixed size). The candidate is the *words*.

## images

A bitmap or vector at a `src` path (local file or `http://localhost:4278/...`).
Renderer uses `object-fit: contain` inside a fixed-aspect container. Optional
label underneath. Use this for logo brackets, photo edits, frame comparisons.

## code

A code snippet with an explicit `language` tag. Renderer syntax-highlights via
`highlight.js`. Monospace fallback if the highlighter fails. Comparison-of-code
beats comparison-of-narrative for "which API surface is cleaner."

## markdown

A piece of CommonMark. Renderer parses with `marked` and sanitizes output with
DOMPurify — embedded `<script>` and inline event handlers are stripped. Use
for docs, READMEs, prompt drafts.

## ai-output

A model response, optionally with the prompt that produced it. Renderer shows
the response in the main panel and the prompt in a faint header above. Use to
compare model A vs model B on the same task, or two prompts on the same model.

## freeform

Arbitrary HTML rendered inside a *sandboxed* `<iframe sandbox="allow-same-origin">`
via `srcDoc`. Scripts do **not** execute. Trusted local content only — there
is no safety net beyond the iframe sandbox. Useful for component variants,
SVG illustrations, landing-page hero blocks.
