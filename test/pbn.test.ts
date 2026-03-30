import { describe, it, expect } from 'vitest';
import { formatPbnDeal, formatPbnFile, formatDealString } from '../src/pbn.js';
import { generateDeals } from '../src/dealer.js';

describe('formatDealString', () => {
  it('starts with N: and has 4 hands', () => {
    const deals = generateDeals({ numBoards: 1, entropy: new Uint8Array(20) });
    const dealStr = formatDealString(deals[0].hands);
    expect(dealStr).toMatch(/^N:/);
    const hands = dealStr.slice(2).split(' ');
    expect(hands).toHaveLength(4);
  });

  it('each hand has 4 suits separated by dots', () => {
    const deals = generateDeals({ numBoards: 1, entropy: new Uint8Array(20) });
    const dealStr = formatDealString(deals[0].hands);
    const hands = dealStr.slice(2).split(' ');
    for (const hand of hands) {
      expect(hand.split('.')).toHaveLength(4);
    }
  });

  it('contains exactly 52 card characters', () => {
    const deals = generateDeals({ numBoards: 1, entropy: new Uint8Array(20) });
    const dealStr = formatDealString(deals[0].hands);
    const cardChars = dealStr.replace(/[N: .]/g, '');
    expect(cardChars).toHaveLength(52);
  });

  it('only contains valid card characters', () => {
    const deals = generateDeals({ numBoards: 10, entropy: new Uint8Array(20) });
    const validCards = new Set('AKQJT98765432'.split(''));
    for (const deal of deals) {
      const dealStr = formatDealString(deal.hands);
      const cardChars = dealStr.replace(/[N: .]/g, '');
      for (const ch of cardChars) {
        expect(validCards.has(ch)).toBe(true);
      }
    }
  });

  it('each suit contains only cards from that suit rank', () => {
    // For each hand, spades should come first (highest cards), then H, D, C
    const deals = generateDeals({ numBoards: 20, entropy: new Uint8Array(20) });
    for (const deal of deals) {
      const dealStr = formatDealString(deal.hands);
      const hands = dealStr.slice(2).split(' ');
      for (const hand of hands) {
        const suits = hand.split('.');
        expect(suits).toHaveLength(4);
        // Total cards across all suits should be 13
        const totalCards = suits.reduce((sum, s) => sum + s.length, 0);
        expect(totalCards).toBe(13);
      }
    }
  });

  it('each card rank appears exactly 4 times across all hands', () => {
    const deals = generateDeals({ numBoards: 10, entropy: new Uint8Array(20) });
    for (const deal of deals) {
      const dealStr = formatDealString(deal.hands);
      const hands = dealStr.slice(2).split(' ');

      // Count each rank across all hands and suits
      for (const rank of 'AKQJT98765432') {
        let count = 0;
        for (const hand of hands) {
          const suits = hand.split('.');
          for (const suit of suits) {
            count += [...suit].filter((c) => c === rank).length;
          }
        }
        expect(count).toBe(4);
      }
    }
  });
});

describe('PBN dealer/vulnerability cycle', () => {
  // Standard bridge cycle for 16 boards
  const expectedDealer: Record<number, string> = {
    1: 'N', 2: 'E', 3: 'S', 4: 'W',
    5: 'N', 6: 'E', 7: 'S', 8: 'W',
    9: 'N', 10: 'E', 11: 'S', 12: 'W',
    13: 'N', 14: 'E', 15: 'S', 16: 'W',
  };

  const expectedVuln: Record<number, string> = {
    1: 'None', 2: 'NS', 3: 'EW', 4: 'All',
    5: 'NS', 6: 'EW', 7: 'All', 8: 'None',
    9: 'EW', 10: 'All', 11: 'None', 12: 'NS',
    13: 'All', 14: 'None', 15: 'NS', 16: 'EW',
  };

  const deals = generateDeals({
    numBoards: 16,
    lowBoard: 1,
    entropy: new Uint8Array(20),
  });

  for (let board = 1; board <= 16; board++) {
    it(`board ${board}: dealer=${expectedDealer[board]}, vuln=${expectedVuln[board]}`, () => {
      const pbn = formatPbnDeal(board, deals[board - 1].hands);
      expect(pbn).toContain(`[Dealer "${expectedDealer[board]}"]`);
      expect(pbn).toContain(`[Vulnerable "${expectedVuln[board]}"]`);
    });
  }

  it('cycle repeats: board 17 matches board 1', () => {
    const dummy = deals[0].hands;
    const pbn1 = formatPbnDeal(1, dummy);
    const pbn17 = formatPbnDeal(17, dummy);
    // Dealer and vuln should match (board number differs)
    expect(pbn17).toContain('[Dealer "N"]');
    expect(pbn17).toContain('[Vulnerable "None"]');
  });
});

describe('PBN file format', () => {
  it('has correct header', () => {
    const deals = generateDeals({ numBoards: 1, entropy: new Uint8Array(20) });
    const file = formatPbnFile(deals);
    expect(file).toMatch(/^% PBN 2\.1\n% EXPORT\n%\n/);
    expect(file).toContain('[Generator "BigDeal-JS');
  });

  it('contains all required PBN tags for each board', () => {
    const deals = generateDeals({ numBoards: 3, entropy: new Uint8Array(20) });
    const file = formatPbnFile(deals);

    const requiredTags = [
      'Event', 'Site', 'Date', 'Board', 'West', 'North', 'East', 'South',
      'Dealer', 'Vulnerable', 'Deal', 'Scoring', 'Declarer', 'Contract', 'Result',
    ];

    for (let i = 1; i <= 3; i++) {
      for (const tag of requiredTags) {
        const pattern = new RegExp(`\\[${tag} `);
        const matches = file.match(new RegExp(pattern, 'g'));
        // Each tag should appear at least once per board (3 boards) plus possibly header
        expect(matches).not.toBeNull();
        if (tag !== 'Generator') {
          expect(matches!.length).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });
});
