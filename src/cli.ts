#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { writeFileSync } from 'node:fs';
import { generateDeals } from './dealer.js';
import { formatPbnFile } from './pbn.js';

const { values } = parseArgs({
  options: {
    boards: { type: 'string', short: 'n', default: '32' },
    output: { type: 'string', short: 'o' },
    owner: { type: 'string', short: 'p', default: 'BigDeal-JS' },
    first: { type: 'string', short: 'f', default: '1' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help) {
  console.log(`BigDeal-JS - Bridge deal generator

Usage: bigdeal [options]

Options:
  -n, --boards <num>   Number of boards to deal (default: 32)
  -o, --output <file>  Output file (default: stdout, adds .pbn suffix)
  -p, --owner <str>    Owner identification string
  -f, --first <num>    First board number (default: 1)
  -h, --help           Show this help
`);
  process.exit(0);
}

const numBoards = parseInt(values.boards!, 10);
const lowBoard = parseInt(values.first!, 10);
const owner = values.owner!;

if (isNaN(numBoards) || numBoards < 1) {
  console.error('Error: boards must be a positive integer');
  process.exit(1);
}

const deals = generateDeals({ owner, numBoards, lowBoard });
const pbn = formatPbnFile(deals);

if (values.output) {
  const filename = values.output.endsWith('.pbn')
    ? values.output
    : values.output + '.pbn';
  writeFileSync(filename, pbn);
  console.log(`Wrote ${numBoards} boards to ${filename}`);
} else {
  process.stdout.write(pbn);
}
