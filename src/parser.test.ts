import { describe, expect, it } from 'vitest';
import { analyseExport, parseDelimited } from './parser';

describe('CSV parser', () => {
  it('handles quoted commas and embedded newlines', () => {
    const parsed = parseDelimited('Front,Back,Reviews,Lapses\n"Why, exactly?","Line one\nLine two",10,4');
    expect(parsed.rows[0].front).toBe('Why, exactly?');
    expect(parsed.rows[0].back).toContain('Line two');
  });

  it('scores card summaries with explainable components', () => {
    const result = analyseExport('card_id,front,back,recent_reviews,recent_failures,average_ms\n42,Capital of France?,Paris,10,5,16000');
    expect(result.format).toBe('card summary');
    expect(result.cards[0]).toMatchObject({ failurePoints: 38, timePoints: 20, repeatPoints: 5, score: 63 });
  });

  it('groups Anki-style review logs and uses the last twenty reviews', () => {
    const rows = Array.from({ length: 22 }, (_, index) => `9,${1000 + index},${index % 2 ? 1 : 3},${5000 + index},Prompt,Answer`).join('\n');
    const result = analyseExport(`cid,id,ease,time,front,back\n${rows}`);
    expect(result.format).toBe('review log');
    expect(result.cards[0].recentReviews).toBe(20);
    expect(result.cards[0].recentFailures).toBe(10);
  });

  it('explains unrecognized files', () => {
    expect(() => analyseExport('foo,bar\na,b')).toThrow(/No prompt column/);
  });
});
