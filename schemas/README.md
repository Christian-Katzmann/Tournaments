# Tournament schema — kinds

The canonical shape lives in `tournament.schema.json` (JSON Schema draft 2020-12). One file per tournament under `tournaments/<slug>.json`. Eight `kind`s are recognised; each enforces a distinct candidate shape via `allOf`/`if`/`then`.

### `typography`
Compares pairs of **font combinations**, where each candidate is a `{ serif, sans }` duo of font ids. The renderer paints the same Danish content templates in serif and sans on a live product canvas, so the judgment is about how the two faces work *together* in context.

### `color`
Each candidate is a colour: `hex` (with optional human `name`). The renderer shows a swatch plus sample text rendered on or against the colour. Use for palette decisions, brand colour selection, or "which red is right" comparisons.

### `copy`
Each candidate is a string of `text` — a headline, a paragraph, a CTA, a tagline. Rendered on a neutral canvas so the words carry the comparison. Use this when you're choosing between drafts that mean roughly the same thing in different voices.

### `images`
Each candidate has a `src` (local path or URL) plus optional `alt`. Rendered at a fixed aspect ratio so layout doesn't distort the comparison. Use for logo concepts, photography choices, generated image alternatives, or icon variants.

### `code`
Each candidate carries `language` plus `code`. Rendered as a syntax-highlighted block. Use for API design A/B, "which implementation reads better", or comparing AI-generated snippets.

### `markdown`
Each candidate is a `markdown` string. Rendered as formatted prose. Use for comparing plans, strategies, structured proposals, or long-form AI outputs where formatting matters to the judgment.

### `ai-output`
Each candidate has a `response` (plus optional `prompt`, `model`). Rendered as a response panel; if a shared prompt isn't on the tournament-level config, the per-candidate prompt is shown above. Use for picking between model outputs in evals.

### `freeform`
Each candidate is raw `html`, rendered in a sandboxed iframe. This is the escape hatch — use when nothing else fits (e.g., comparing entire mini-pages, hand-authored HTML widgets, or content from outside the closed taxonomy).
