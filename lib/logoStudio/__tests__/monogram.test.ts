import { describe, it, expect } from 'vitest';
import { monogramLettersOk } from '../aiLayers.server';

describe('monogramLettersOk', () => {
  it('accepts any order and final forms', () => {
    expect(monogramLettersOk('חי', 'יח')).toBe(true);
    expect(monogramLettersOk('םא', 'אמ')).toBe(true);
  });
  it('accepts one extra letter read from interlocking strokes', () => {
    expect(monogramLettersOk('יחו', 'יח')).toBe(true);
  });
  it('rejects a missing or wrong letter', () => {
    expect(monogramLettersOk('י', 'יח')).toBe(false);
    expect(monogramLettersOk('יג', 'יח')).toBe(false);
    expect(monogramLettersOk('יחוב', 'יח')).toBe(false);
  });
});
