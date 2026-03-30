export const NORTH = 0;
export const EAST = 1;
export const SOUTH = 2;
export const WEST = 3;
export const NCOMPASS = 4;

export const SUIT_SPADES = 0;
export const SUIT_HEARTS = 1;
export const SUIT_DIAMONDS = 2;
export const SUIT_CLUBS = 3;
export const NSUIT = 4;

export const NCARDSPERHAND = 13;
export const NCARDSPERDECK = 52;

/**
 * Internal representation from code_to_hand: per compass, 13 skip values.
 * These are cumulative indices into the remaining cards.
 */
export type DealInternal = number[][];

/**
 * By-hand representation: per compass, 13 card numbers (1-52).
 * 1=AS, 2=KS, ..., 13=2S, 14=AH, ..., 52=2C
 */
export type DealByHand = number[][];

export interface DealerOptions {
  owner?: string;
  numBoards?: number;
  lowBoard?: number;
  entropy?: Uint8Array;
}

export interface GeneratedDeal {
  boardNo: number;
  hands: DealByHand;
}
