import { NCARDSPERHAND, NCARDSPERDECK, NCOMPASS, WEST } from './types.js';
import type { DealInternal } from './types.js';

const pascalTriangle: bigint[][] = [];
let initialized = false;

export function initPascalTriangle(): void {
  if (initialized) return;

  for (let i = 0; i <= NCARDSPERDECK; i++) {
    pascalTriangle[i] = [];
    const min = Math.min(i, NCARDSPERHAND);
    for (let j = 0; j <= min; j++) {
      if (i === j || j === 0) {
        pascalTriangle[i][j] = 1n;
      } else {
        pascalTriangle[i][j] =
          pascalTriangle[i - 1][j] + pascalTriangle[i - 1][j - 1];
      }
    }
  }
  initialized = true;
}

export function nOverK(n: number, k: number): bigint {
  if (n <= NCARDSPERDECK && k <= NCARDSPERHAND && k <= n) {
    return pascalTriangle[n][k];
  }
  return 0n;
}

/**
 * Total number of possible bridge deals:
 * C(52,13) * C(39,13) * C(26,13)
 */
export function totalDeals(): bigint {
  initPascalTriangle();
  return nOverK(52, 13) * nOverK(39, 13) * nOverK(26, 13);
}

/**
 * Convert a Goedel number to the internal deal representation.
 * Direct port of code_to_hand from binomial.c, using BigInt.
 */
export function codeToHand(goedelNumber: bigint): DealInternal {
  initPascalTriangle();

  const hand: DealInternal = Array.from({ length: NCOMPASS }, () =>
    new Array(NCARDSPERHAND).fill(0)
  );

  let g = goedelNumber;

  for (let compass = 0; compass < NCOMPASS; compass++) {
    // Compute constant c for this compass direction
    // c = product of C(i*13, 13) for i=2..WEST-compass
    let c = 1n;
    for (let i = 2; i <= WEST - compass; i++) {
      c *= nOverK(i * 13, 13);
    }

    let a = 0;
    for (let j = 0; j < NCARDSPERHAND; j++) {
      const cardsLeft = 13 * (NCOMPASS - compass);
      const slotsLeft = 13 - j;

      const tmp1 = nOverK(cardsLeft - a - j, slotsLeft);

      // Find b: increment from a until condition met
      let b = a;
      for (; ; b++) {
        const tmp2 = tmp1 - nOverK(cardsLeft - b - 1 - j, slotsLeft);
        const val = tmp2 * c;
        if (val > g) break;
      }

      // x_j = (C(cardsLeft-a-j, slotsLeft) - C(cardsLeft-b-j, slotsLeft)) * c
      const x =
        (nOverK(cardsLeft - a - j, slotsLeft) -
          nOverK(cardsLeft - b - j, slotsLeft)) *
        c;

      g -= x;
      hand[compass][j] = b;
      a = b;
    }
  }

  return hand;
}

/**
 * Convert an internal deal representation back to a Goedel number.
 * This is the inverse of codeToHand.
 */
export function handToCode(hand: DealInternal): bigint {
  initPascalTriangle();

  let g = 0n;

  for (let compass = 0; compass < NCOMPASS; compass++) {
    let c = 1n;
    for (let i = 2; i <= WEST - compass; i++) {
      c *= nOverK(i * 13, 13);
    }

    let a = 0;
    for (let j = 0; j < NCARDSPERHAND; j++) {
      const cardsLeft = 13 * (NCOMPASS - compass);
      const slotsLeft = 13 - j;
      const b = hand[compass][j];

      // x_j = (C(cardsLeft-a-j, slotsLeft) - C(cardsLeft-b-j, slotsLeft)) * c
      const x =
        (nOverK(cardsLeft - a - j, slotsLeft) -
          nOverK(cardsLeft - b - j, slotsLeft)) *
        c;

      g += x;
      a = b;
    }
  }

  return g;
}
