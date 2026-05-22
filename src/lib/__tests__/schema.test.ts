import { describe, it, expect } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');

const schema = JSON.parse(readFileSync(path.join(repoRoot, 'schemas', 'tournament.schema.json'), 'utf8'));
const example = JSON.parse(readFileSync(path.join(repoRoot, 'tournaments', 'example-typography.json'), 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

describe('tournament schema', () => {
  it('validates the canonical example tournament', () => {
    const ok = validate(example);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });

  it('rejects a tournament missing the kind field', () => {
    const rest = { ...example };
    delete rest.kind;
    expect(validate(rest)).toBe(false);
  });

  it('rejects an unknown methodology', () => {
    expect(validate({ ...example, methodology: 'not-a-real-methodology' })).toBe(false);
  });

  it('rejects an unknown kind', () => {
    expect(validate({ ...example, kind: 'haiku-battle' })).toBe(false);
  });

  it('rejects color-shaped candidates inside a typography tournament', () => {
    const wrongShape = {
      ...example,
      candidates: [
        { id: 'c1', label: 'Crimson', hex: '#dc143c' },
        { id: 'c2', label: 'Navy', hex: '#000080' },
      ],
    };
    expect(validate(wrongShape)).toBe(false);
  });

  it('rejects bracket-4-seed tournaments without exactly 4 candidates', () => {
    const tooFew = {
      ...example,
      methodology: 'bracket-4-seed',
      config: { seeding: 'shuffled' },
      candidates: example.candidates.slice(0, 3),
    };
    expect(validate(tooFew)).toBe(false);
    const tooMany = {
      ...example,
      methodology: 'bracket-4-seed',
      config: { seeding: 'shuffled' },
      candidates: [...example.candidates, { id: 'p5', label: 'Extra', serif: 'lora', sans: 'inter' }],
    };
    expect(validate(tooMany)).toBe(false);
  });

  it('rejects an out-of-range hex value on a color tournament', () => {
    const colorTournament = {
      ...example,
      kind: 'color',
      candidates: [
        { id: 'c1', label: 'Crimson', hex: 'not-a-hex' },
        { id: 'c2', label: 'Navy', hex: '#000080' },
      ],
      config: {},
    };
    expect(validate(colorTournament)).toBe(false);
  });

  it('accepts a well-formed color tournament', () => {
    const colorTournament = {
      ...example,
      slug: 'example-color',
      kind: 'color',
      methodology: 'bradley-terry',
      candidates: [
        { id: 'c1', label: 'Crimson', hex: '#dc143c' },
        { id: 'c2', label: 'Navy', hex: '#000080' },
        { id: 'c3', label: 'Sage', hex: '#9caf88', name: 'sage green' },
      ],
      config: { maxIterations: 200, convergenceTolerance: 1e-6 },
    };
    const ok = validate(colorTournament);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });
});
