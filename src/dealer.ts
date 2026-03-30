import { ripemd160 } from '@noble/hashes/legacy.js';
import { initPascalTriangle, totalDeals, codeToHand } from './binomial.js';
import { getRandomBytes } from './entropy.js';
import {
  NCOMPASS,
  NCARDSPERHAND,
  NCARDSPERDECK,
  NORTH,
  WEST,
} from './types.js';
import type { DealInternal, DealByHand, DealerOptions, GeneratedDeal } from './types.js';

const RMD_BYTES = 20;
const GOEDEL_BYTES = 12; // 96 bits

function hashRmd160(data: Uint8Array): Uint8Array {
  return ripemd160(data);
}

function buildSeed(
  seqno: number,
  randomBytes: Uint8Array,
  ownerHash: Uint8Array
): Uint8Array {
  const seed = new Uint8Array(4 + RMD_BYTES + RMD_BYTES);

  // Sequence number in little-endian
  seed[0] = seqno & 0xff;
  seed[1] = (seqno >> 8) & 0xff;
  seed[2] = (seqno >> 16) & 0xff;
  seed[3] = (seqno >> 24) & 0xff;

  seed.set(randomBytes, 4);
  seed.set(ownerHash, 4 + RMD_BYTES);

  return seed;
}

function extractGoedelNumber(hash: Uint8Array): bigint {
  let n = 0n;
  for (let i = 0; i < GOEDEL_BYTES; i++) {
    n = (n << 8n) | BigInt(hash[i]);
  }
  return n;
}

/**
 * Convert internal representation (skip values) to by-hand (card numbers 1-52).
 * Port of cnv_int_byh from output.c.
 */
export function convertInternalToByHand(di: DealInternal): DealByHand {
  // Linked list: nextcard[i] points to the next available card
  const nextcard = new Array<number>(NCARDSPERDECK + 1);
  for (let i = 0; i < NCARDSPERDECK; i++) {
    nextcard[i] = i + 1;
  }
  nextcard[NCARDSPERDECK] = 0;

  const hands: DealByHand = Array.from({ length: NCOMPASS }, () =>
    new Array(NCARDSPERHAND).fill(0)
  );

  for (let compass = NORTH; compass <= WEST; compass++) {
    let prevcard = 0;
    let card = nextcard[prevcard];

    for (let i = 0; i < NCARDSPERHAND; i++) {
      const skip =
        i === 0
          ? di[compass][0]
          : di[compass][i] - di[compass][i - 1];

      for (let s = 0; s < skip; s++) {
        prevcard = card;
        card = nextcard[card];
      }

      hands[compass][i] = card;

      // Remove picked card from the linked list
      card = nextcard[card];
      nextcard[prevcard] = card;
    }
  }

  return hands;
}

/**
 * Generate bridge deals.
 */
export function generateDeals(options: DealerOptions = {}): GeneratedDeal[] {
  const {
    owner = 'BigDeal-JS',
    numBoards = 1,
    lowBoard = 1,
    entropy,
  } = options;

  initPascalTriangle();
  const maxDeals = totalDeals();

  const ownerHash = hashRmd160(new TextEncoder().encode(owner));
  const randomBytes = entropy ?? getRandomBytes(RMD_BYTES);

  const results: GeneratedDeal[] = [];
  let seqno = 0;

  for (let boardNo = lowBoard; boardNo < lowBoard + numBoards; boardNo++) {
    let goedel: bigint;

    // Rejection sampling: keep hashing until we get a valid Goedel number
    do {
      seqno++;
      const seed = buildSeed(seqno, randomBytes, ownerHash);
      const hash = hashRmd160(seed);
      goedel = extractGoedelNumber(hash);
    } while (goedel >= maxDeals);

    const internal = codeToHand(goedel);
    const hands = convertInternalToByHand(internal);

    results.push({ boardNo, hands });
  }

  return results;
}
