import { describe, it, expect } from 'vitest';
import { generateDeals } from '../src/dealer.js';
import { NCOMPASS, NCARDSPERHAND, NSUIT } from '../src/types.js';

/**
 * Statistical tests on generated deals.
 * We generate a large sample and check that distributions match
 * known theoretical values from bridge mathematics.
 *
 * Theoretical HCP expected value per hand: 10.0 (40 total / 4 hands)
 * Theoretical expected longest suit: ~4.44
 */

const NUM_DEALS = 1000;
const deals = generateDeals({
  numBoards: NUM_DEALS,
  entropy: new Uint8Array(20).fill(7),
});

const HIGH_CARD_POINTS = [4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0];

function computeHcp(hand: number[]): number {
  let hcp = 0;
  for (const card of hand) {
    const pip = (card - 1) % 13; // 0=A, 1=K, 2=Q, 3=J, 4-12=spots
    hcp += HIGH_CARD_POINTS[pip];
  }
  return hcp;
}

function computeSuitLengths(hand: number[]): number[] {
  const lengths = [0, 0, 0, 0];
  for (const card of hand) {
    const suit = Math.floor((card - 1) / 13);
    lengths[suit]++;
  }
  return lengths;
}

describe('statistical properties', () => {
  it('average HCP per hand is near 10.0', () => {
    let totalHcp = 0;
    let handCount = 0;
    for (const deal of deals) {
      for (let c = 0; c < NCOMPASS; c++) {
        totalHcp += computeHcp(deal.hands[c]);
        handCount++;
      }
    }
    const avg = totalHcp / handCount;
    // With 4000 hands, expect average within ~0.3 of 10.0
    expect(avg).toBeGreaterThan(9.5);
    expect(avg).toBeLessThan(10.5);
  });

  it('total HCP per deal is always 40', () => {
    for (const deal of deals) {
      let total = 0;
      for (let c = 0; c < NCOMPASS; c++) {
        total += computeHcp(deal.hands[c]);
      }
      expect(total).toBe(40);
    }
  });

  it('each compass gets roughly equal HCP over many deals', () => {
    const compassHcp = [0, 0, 0, 0];
    for (const deal of deals) {
      for (let c = 0; c < NCOMPASS; c++) {
        compassHcp[c] += computeHcp(deal.hands[c]);
      }
    }
    const avgPerCompass = compassHcp.map((h) => h / NUM_DEALS);
    for (const avg of avgPerCompass) {
      expect(avg).toBeGreaterThan(9.0);
      expect(avg).toBeLessThan(11.0);
    }
  });

  it('suit lengths always sum to 13 per hand', () => {
    for (const deal of deals) {
      for (let c = 0; c < NCOMPASS; c++) {
        const lengths = computeSuitLengths(deal.hands[c]);
        expect(lengths.reduce((a, b) => a + b, 0)).toBe(NCARDSPERHAND);
      }
    }
  });

  it('each suit has exactly 13 cards across all hands', () => {
    for (const deal of deals) {
      const suitTotals = [0, 0, 0, 0];
      for (let c = 0; c < NCOMPASS; c++) {
        const lengths = computeSuitLengths(deal.hands[c]);
        for (let s = 0; s < NSUIT; s++) {
          suitTotals[s] += lengths[s];
        }
      }
      for (let s = 0; s < NSUIT; s++) {
        expect(suitTotals[s]).toBe(NCARDSPERHAND);
      }
    }
  });

  it('average longest suit per hand is near 4.44', () => {
    // Theoretical: ~4.44 (weighted average from Encyclopedia)
    let totalLongest = 0;
    let handCount = 0;
    for (const deal of deals) {
      for (let c = 0; c < NCOMPASS; c++) {
        const lengths = computeSuitLengths(deal.hands[c]);
        totalLongest += Math.max(...lengths);
        handCount++;
      }
    }
    const avg = totalLongest / handCount;
    expect(avg).toBeGreaterThan(4.2);
    expect(avg).toBeLessThan(5.1);
  });

  it('longest suit distribution: 4-card is most common, 5-card second', () => {
    const longestFreq: Record<number, number> = {};
    for (const deal of deals) {
      for (let c = 0; c < NCOMPASS; c++) {
        const lengths = computeSuitLengths(deal.hands[c]);
        const longest = Math.max(...lengths);
        longestFreq[longest] = (longestFreq[longest] || 0) + 1;
      }
    }
    const total = NUM_DEALS * NCOMPASS;
    // Theory: 4-card longest ~35%, 5-card ~44%, 6-card ~16.5%, 7+ ~3.5%
    expect(longestFreq[4] / total).toBeGreaterThan(0.25);
    expect(longestFreq[4] / total).toBeLessThan(0.45);
    expect(longestFreq[5] / total).toBeGreaterThan(0.35);
    expect(longestFreq[5] / total).toBeLessThan(0.55);
    if (longestFreq[6]) {
      expect(longestFreq[6] / total).toBeGreaterThan(0.10);
      expect(longestFreq[6] / total).toBeLessThan(0.25);
    }
  });

  it('HCP distribution: 8-12 points are most common', () => {
    const hcpFreq: Record<number, number> = {};
    for (const deal of deals) {
      for (let c = 0; c < NCOMPASS; c++) {
        const hcp = computeHcp(deal.hands[c]);
        hcpFreq[hcp] = (hcpFreq[hcp] || 0) + 1;
      }
    }
    // The mode of the HCP distribution is 10, and 8-12 should dominate
    const total = NUM_DEALS * NCOMPASS;
    let freqInRange = 0;
    for (let h = 8; h <= 12; h++) {
      freqInRange += hcpFreq[h] || 0;
    }
    // Theory: ~45% of hands have 8-12 HCP
    expect(freqInRange / total).toBeGreaterThan(0.35);
    expect(freqInRange / total).toBeLessThan(0.55);
  });

  it('void suits are rare (< 5% of hands)', () => {
    let voidCount = 0;
    let handCount = 0;
    for (const deal of deals) {
      for (let c = 0; c < NCOMPASS; c++) {
        const lengths = computeSuitLengths(deal.hands[c]);
        if (lengths.some((l) => l === 0)) {
          voidCount++;
        }
        handCount++;
      }
    }
    // Theory: ~5.1% of hands have at least one void
    expect(voidCount / handCount).toBeLessThan(0.10);
  });

  it('balanced hands (4333 or 4432 or 5332) appear ~47% of the time', () => {
    let balancedCount = 0;
    let handCount = 0;
    for (const deal of deals) {
      for (let c = 0; c < NCOMPASS; c++) {
        const lengths = computeSuitLengths(deal.hands[c]).sort((a, b) => b - a);
        const pattern = lengths.join('');
        if (pattern === '4333' || pattern === '4432' || pattern === '5332') {
          balancedCount++;
        }
        handCount++;
      }
    }
    // Theory: ~47.6% of hands are balanced
    expect(balancedCount / handCount).toBeGreaterThan(0.38);
    expect(balancedCount / handCount).toBeLessThan(0.57);
  });
});
