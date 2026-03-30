import {
  NORTH,
  WEST,
  SUIT_SPADES,
  SUIT_CLUBS,
  NCARDSPERHAND,
  NSUIT,
} from './types.js';
import type { DealByHand, GeneratedDeal } from './types.js';

const VERSION_MAJOR = 0;
const VERSION_MINOR = 1;

const CARD_REP = 'AKQJT98765432';
const DEALER_STR = ['W', 'N', 'E', 'S'];
const VULN_STR = ['None', 'NS', 'EW', 'All'];
const VULN_INDEX = [
  2, 0, 1, 2,
  3, 1, 2, 3,
  0, 2, 3, 0,
  1, 3, 0, 1,
];

function pbnRec(key: string, value: string | null): string {
  return `[${key} "${value ?? '?'}"]`;
}

/**
 * Format a single hand's deal string: "spades.hearts.diamonds.clubs"
 */
function formatHandSuits(hand: number[]): string {
  const suits: string[] = [];

  for (let suit = SUIT_SPADES; suit <= SUIT_CLUBS; suit++) {
    let suitStr = '';
    for (let i = 0; i < NCARDSPERHAND; i++) {
      const card = hand[i];
      const cardInSuit = card - 13 * suit;
      if (cardInSuit > 0 && cardInSuit <= 13) {
        suitStr += CARD_REP[cardInSuit - 1];
      }
    }
    suits.push(suitStr);
  }

  return suits.join('.');
}

/**
 * Format the Deal tag value: "N:hand hand hand hand"
 */
export function formatDealString(deal: DealByHand): string {
  const hands: string[] = [];
  for (let compass = NORTH; compass <= WEST; compass++) {
    hands.push(formatHandSuits(deal[compass]));
  }
  return 'N:' + hands.join(' ');
}

/**
 * Format a single board as PBN.
 */
export function formatPbnDeal(boardNo: number, deal: DealByHand): string {
  const lines: string[] = [];

  lines.push(pbnRec('Event', null));
  lines.push(pbnRec('Site', null));
  lines.push(pbnRec('Date', null));
  lines.push(pbnRec('Board', String(boardNo)));
  lines.push(pbnRec('West', null));
  lines.push(pbnRec('North', null));
  lines.push(pbnRec('East', null));
  lines.push(pbnRec('South', null));
  lines.push(pbnRec('Dealer', DEALER_STR[boardNo % 4]));
  lines.push(pbnRec('Vulnerable', VULN_STR[VULN_INDEX[boardNo % 16]]));
  lines.push(`[Deal "${formatDealString(deal)}"]`);
  lines.push(pbnRec('Scoring', null));
  lines.push(pbnRec('Declarer', null));
  lines.push(pbnRec('Contract', null));
  lines.push(pbnRec('Result', null));
  lines.push('');

  return lines.join('\n');
}

/**
 * Format a complete PBN file with header.
 */
export function formatPbnFile(deals: GeneratedDeal[]): string {
  const header = `% PBN 2.1\n% EXPORT\n%\n[Generator "BigDeal-JS version ${VERSION_MAJOR}.${VERSION_MINOR}"]\n`;
  const boards = deals.map((d) => formatPbnDeal(d.boardNo, d.hands)).join('\n');
  return header + boards;
}
