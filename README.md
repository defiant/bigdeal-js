# BigDeal-JS

TypeScript port of [BigDeal](https://github.com/hansvanstaveren/BigDeal), the standard bridge deal generator used in international tournaments worldwide.

BigDeal-JS generates cryptographically random bridge deals using the same Goedel numbering system as the original — a bijective mapping between 96-bit integers and all 53,644,737,765,488,792,839,237,440,000 possible bridge deals.

## How It Works

1. Collects entropy from the platform's CSPRNG (`crypto.getRandomValues`)
2. Hashes entropy + owner ID + sequence counter with RIPEMD-160
3. Extracts a 96-bit candidate from the hash output
4. Rejects candidates outside the valid deal range (rejection sampling)
5. Decodes valid numbers into hands using combinatorial (binomial coefficient) decomposition
6. Outputs in PBN (Portable Bridge Notation) format

## Install

```bash
pnpm install
pnpm run build
```

## CLI Usage

```bash
# Deal 32 boards to stdout
node dist/cli.js -n 32

# Deal 16 boards to a file
node dist/cli.js -n 16 -o session1

# Custom owner ID and starting board
node dist/cli.js -n 8 -f 17 -p "Club Game 2026"
```

| Flag | Description | Default |
|------|-------------|---------|
| `-n, --boards` | Number of boards | 32 |
| `-o, --output` | Output file (`.pbn` suffix added) | stdout |
| `-p, --owner` | Owner/tournament identification | BigDeal-JS |
| `-f, --first` | First board number | 1 |

## Library Usage

```typescript
import { generateDeals, formatPbnFile } from 'bigdeal';

const deals = generateDeals({
  numBoards: 16,
  owner: 'Friday Pairs',
});

console.log(formatPbnFile(deals));
```

Works in both Node.js and browsers — no platform-specific dependencies.

## Testing

```bash
pnpm test
```

The test suite includes:

- **Round-trip verification** — `handToCode(codeToHand(n)) === n` for 500+ values spanning the full Goedel number range, proving the bijection is correct
- **Deal invariants** — every deal has exactly 52 unique cards, 13 per hand, with correct suit structure
- **Statistical tests** — HCP distribution, suit lengths, void frequency, and balanced hand frequency match known theoretical values over 1000 deals
- **PBN format** — dealer/vulnerability cycle for all 16 boards, tag completeness, card character validation

## Output Format

PBN 2.1 export format, compatible with most bridge software:

```
% PBN 2.1
% EXPORT
%
[Generator "BigDeal-JS version 0.1"]
[Board "1"]
[Dealer "N"]
[Vulnerable "None"]
[Deal "N:KQ2.Q73.542.QT97 AT83.T654.AKT93. 9654.AJ8.Q6.AJ52 J7.K92.J87.K8643"]
...
```

## Roadmap

- [ ] Additional output formats (LIN, DUP, CSV)
- [ ] Bit-for-bit compatibility with the C version
- [ ] Square Deal support
- [ ] npm package publishing

## Credits

Based on [BigDeal](https://github.com/hansvanstaveren/BigDeal) by Hans van Staveren, the official dealing program of the World Bridge Federation. The Goedel numbering system is described in the accompanying [mathematical paper](https://github.com/hansvanstaveren/BigDeal/blob/master/PDF/godel.pdf).
