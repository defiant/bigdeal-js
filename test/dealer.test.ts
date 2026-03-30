import { describe, it, expect } from 'vitest';
import { generateDeals, convertInternalToByHand } from '../src/dealer.js';
import { codeToHand, totalDeals } from '../src/binomial.js';
import { NCOMPASS, NCARDSPERHAND, NCARDSPERDECK } from '../src/types.js';

describe('convertInternalToByHand', () => {
  it('cards are in range 1-52', () => {
    for (const goedel of [0n, 1n, 12345678n, totalDeals() - 1n]) {
      const hands = convertInternalToByHand(codeToHand(goedel));
      for (let c = 0; c < NCOMPASS; c++) {
        for (const card of hands[c]) {
          expect(card).toBeGreaterThanOrEqual(1);
          expect(card).toBeLessThanOrEqual(NCARDSPERDECK);
        }
      }
    }
  });

  it('cards within each hand are strictly increasing', () => {
    for (const goedel of [0n, 1n, 12345678n, totalDeals() - 1n]) {
      const hands = convertInternalToByHand(codeToHand(goedel));
      for (let c = 0; c < NCOMPASS; c++) {
        for (let j = 1; j < NCARDSPERHAND; j++) {
          expect(hands[c][j]).toBeGreaterThan(hands[c][j - 1]);
        }
      }
    }
  });

  it('all 52 cards present for many deals', () => {
    let x = 42n;
    const max = totalDeals();
    for (let i = 0; i < 50; i++) {
      x = (x * 6364136223846793005n + 1442695040888963407n) % (2n ** 64n);
      const goedel = (x * max) / (2n ** 64n);
      const hands = convertInternalToByHand(codeToHand(goedel));

      const allCards: number[] = [];
      for (let c = 0; c < NCOMPASS; c++) {
        allCards.push(...hands[c]);
      }
      allCards.sort((a, b) => a - b);
      expect(allCards).toHaveLength(NCARDSPERDECK);
      for (let j = 0; j < NCARDSPERDECK; j++) {
        expect(allCards[j]).toBe(j + 1);
      }
    }
  });
});

describe('generateDeals', () => {
  it('generates the requested number of boards', () => {
    const deals = generateDeals({ numBoards: 5, entropy: new Uint8Array(20) });
    expect(deals).toHaveLength(5);
  });

  it('boards are numbered correctly with default start', () => {
    const deals = generateDeals({
      numBoards: 3,
      entropy: new Uint8Array(20),
    });
    expect(deals.map((d) => d.boardNo)).toEqual([1, 2, 3]);
  });

  it('boards are numbered correctly with custom start', () => {
    const deals = generateDeals({
      numBoards: 3,
      lowBoard: 5,
      entropy: new Uint8Array(20),
    });
    expect(deals.map((d) => d.boardNo)).toEqual([5, 6, 7]);
  });

  it('every generated deal has 52 unique cards', () => {
    const deals = generateDeals({ numBoards: 50, entropy: new Uint8Array(20) });

    for (const deal of deals) {
      const allCards = new Set<number>();
      for (let c = 0; c < NCOMPASS; c++) {
        expect(deal.hands[c]).toHaveLength(NCARDSPERHAND);
        for (const card of deal.hands[c]) {
          allCards.add(card);
        }
      }
      expect(allCards.size).toBe(NCARDSPERDECK);
    }
  });

  it('is deterministic with same entropy and owner', () => {
    const entropy = new Uint8Array(20).fill(42);
    const a = generateDeals({ numBoards: 10, owner: 'test', entropy });
    const b = generateDeals({ numBoards: 10, owner: 'test', entropy });
    expect(a).toEqual(b);
  });

  it('different owners produce different deals', () => {
    const entropy = new Uint8Array(20).fill(42);
    const a = generateDeals({ numBoards: 1, owner: 'alice', entropy });
    const b = generateDeals({ numBoards: 1, owner: 'bob', entropy });
    expect(a[0].hands).not.toEqual(b[0].hands);
  });

  it('different entropy produces different deals', () => {
    const a = generateDeals({
      numBoards: 1,
      owner: 'same',
      entropy: new Uint8Array(20).fill(1),
    });
    const b = generateDeals({
      numBoards: 1,
      owner: 'same',
      entropy: new Uint8Array(20).fill(2),
    });
    expect(a[0].hands).not.toEqual(b[0].hands);
  });

  it('all boards in a set are different', () => {
    const deals = generateDeals({ numBoards: 100, entropy: new Uint8Array(20) });
    const seen = new Set<string>();
    for (const deal of deals) {
      const key = deal.hands.flat().join(',');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
