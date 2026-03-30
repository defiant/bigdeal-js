import { describe, it, expect } from 'vitest';
import {
  initPascalTriangle,
  nOverK,
  totalDeals,
  codeToHand,
  handToCode,
} from '../src/binomial.js';
import { convertInternalToByHand } from '../src/dealer.js';
import { NCOMPASS, NCARDSPERHAND, NCARDSPERDECK } from '../src/types.js';

describe('Pascal triangle / binomial coefficients', () => {
  it('computes known binomial coefficients', () => {
    initPascalTriangle();
    expect(nOverK(52, 13)).toBe(635013559600n);
    expect(nOverK(39, 13)).toBe(8122425444n);
    expect(nOverK(26, 13)).toBe(10400600n);
    expect(nOverK(13, 13)).toBe(1n);
    expect(nOverK(13, 0)).toBe(1n);
    expect(nOverK(0, 0)).toBe(1n);
    expect(nOverK(1, 0)).toBe(1n);
    expect(nOverK(1, 1)).toBe(1n);
    expect(nOverK(5, 2)).toBe(10n);
    expect(nOverK(10, 5)).toBe(252n);
    expect(nOverK(52, 1)).toBe(52n);
  });

  it('returns 0 for invalid inputs', () => {
    initPascalTriangle();
    expect(nOverK(5, 14)).toBe(0n); // k > NCARDSPERHAND
    expect(nOverK(53, 1)).toBe(0n); // n > NCARDSPERDECK
  });

  it('computes total deals correctly', () => {
    // Known value: 53,644,737,765,488,792,839,237,440,000
    const total = totalDeals();
    expect(total).toBe(53644737765488792839237440000n);
  });

  it('total deals fits in 96 bits', () => {
    const total = totalDeals();
    expect(total).toBeLessThan(2n ** 96n);
  });

  it('satisfies Pascal identity: C(n,k) = C(n-1,k-1) + C(n-1,k)', () => {
    initPascalTriangle();
    for (let n = 2; n <= 52; n++) {
      for (let k = 1; k <= Math.min(n - 1, 13); k++) {
        expect(nOverK(n, k)).toBe(nOverK(n - 1, k - 1) + nOverK(n - 1, k));
      }
    }
  });

  it('satisfies symmetry: C(n,k) = C(n, n-k) for small k', () => {
    initPascalTriangle();
    // Only testable when both k and n-k are <= 13
    for (let n = 0; n <= 26; n++) {
      for (let k = 0; k <= Math.min(n, 13); k++) {
        if (n - k <= 13) {
          expect(nOverK(n, k)).toBe(nOverK(n, n - k));
        }
      }
    }
  });
});

describe('codeToHand', () => {
  it('produces valid structure for Goedel 0', () => {
    const internal = codeToHand(0n);
    expect(internal).toHaveLength(NCOMPASS);
    for (let c = 0; c < NCOMPASS; c++) {
      expect(internal[c]).toHaveLength(NCARDSPERHAND);
    }
  });

  it('internal values are monotonically non-decreasing per hand', () => {
    // The skip values in di_hand should be non-decreasing
    for (const goedel of [0n, 1n, 100n, 999999n, totalDeals() - 1n]) {
      const internal = codeToHand(goedel);
      for (let c = 0; c < NCOMPASS; c++) {
        for (let j = 1; j < NCARDSPERHAND; j++) {
          expect(internal[c][j]).toBeGreaterThanOrEqual(internal[c][j - 1]);
        }
      }
    }
  });

  it('every deal has exactly 52 unique cards after conversion', () => {
    const testValues = [
      0n,
      1n,
      2n,
      1000n,
      1000000n,
      1000000000n,
      totalDeals() / 2n,
      totalDeals() - 1n,
      totalDeals() - 2n,
    ];

    for (const goedel of testValues) {
      const internal = codeToHand(goedel);
      const hands = convertInternalToByHand(internal);

      const allCards = new Set<number>();
      for (let c = 0; c < NCOMPASS; c++) {
        expect(hands[c]).toHaveLength(NCARDSPERHAND);
        for (const card of hands[c]) {
          expect(card).toBeGreaterThanOrEqual(1);
          expect(card).toBeLessThanOrEqual(NCARDSPERDECK);
          allCards.add(card);
        }
      }
      expect(allCards.size).toBe(NCARDSPERDECK);
    }
  });

  it('different goedel numbers produce different deals', () => {
    const seen = new Set<string>();
    for (let i = 0n; i < 100n; i++) {
      const hands = convertInternalToByHand(codeToHand(i));
      const key = hands.flat().join(',');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('Goedel 0 gives North skip values that are all zero', () => {
    const internal = codeToHand(0n);
    // For Goedel 0, North should get skip values [0,0,0,...,0]
    // meaning "take the first available card each time"
    for (let j = 0; j < NCARDSPERHAND; j++) {
      expect(internal[0][j]).toBe(0);
    }
  });
});

describe('handToCode (inverse) and round-trip', () => {
  it('round-trips Goedel 0', () => {
    const internal = codeToHand(0n);
    expect(handToCode(internal)).toBe(0n);
  });

  it('round-trips Goedel 1', () => {
    const internal = codeToHand(1n);
    expect(handToCode(internal)).toBe(1n);
  });

  it('round-trips totalDeals - 1 (maximum valid)', () => {
    const max = totalDeals() - 1n;
    const internal = codeToHand(max);
    expect(handToCode(internal)).toBe(max);
  });

  it('round-trips 100 sequential values from 0', () => {
    for (let i = 0n; i < 100n; i++) {
      const internal = codeToHand(i);
      const recovered = handToCode(internal);
      expect(recovered).toBe(i);
    }
  });

  it('round-trips 100 sequential values near totalDeals', () => {
    const max = totalDeals();
    for (let i = max - 100n; i < max; i++) {
      const internal = codeToHand(i);
      const recovered = handToCode(internal);
      expect(recovered).toBe(i);
    }
  });

  it('round-trips 100 values near the midpoint', () => {
    const mid = totalDeals() / 2n;
    for (let i = mid; i < mid + 100n; i++) {
      const internal = codeToHand(i);
      const recovered = handToCode(internal);
      expect(recovered).toBe(i);
    }
  });

  it('round-trips 200 random Goedel numbers', () => {
    const max = totalDeals();
    // Use a simple deterministic PRNG to pick test values spread across the range
    let x = 123456789n;
    for (let i = 0; i < 200; i++) {
      x = (x * 6364136223846793005n + 1442695040888963407n) % (2n ** 64n);
      const goedel = (x * max) / (2n ** 64n); // scale to [0, max)
      const internal = codeToHand(goedel);
      const recovered = handToCode(internal);
      expect(recovered).toBe(goedel);
    }
  });

  it('round-trips powers of 10', () => {
    const max = totalDeals();
    let p = 1n;
    while (p < max) {
      const internal = codeToHand(p);
      const recovered = handToCode(internal);
      expect(recovered).toBe(p);
      p *= 10n;
    }
  });
});
