# MotionMint business model

## Positioning

English-first brand line: **Make anyone move.**

Chinese companion line: **让任何人，动起来。**

MotionMint should not look like a model hosting site. It should look like a creative studio where the model is invisible and the outcome is obvious.

## Why API resale can still be profitable

Viggle's published API costs are low enough for a credit model, but raw resale at cost is not viable. The price needs to cover:

- model cost
- storage and bandwidth
- failed and retried jobs
- payment fees
- support
- abuse prevention
- gross margin for advertising and creator payouts

Assume one MotionMint credit has a retail value of **$0.10**.

| Output | Approx. Viggle API cost | MotionMint price | Gross margin before infrastructure |
|---|---:|---:|---:|
| 5s character mix | $0.05 | 4 credits / $0.40 | ~87% |
| 5s scene remake | $0.30 | 12 credits / $1.20 | ~75% |
| 5s H3 video at 768p | $0.15 | 8 credits / $0.80 | ~81% |
| 1K image | $0.01 | 1 credit / $0.10 | ~90% |
| 2K image | $0.02 | 2 credits / $0.20 | ~90% |
| 3D character | $0.25-$0.30 | 20-30 credits / $2-$3 | ~85%-90% |

Infrastructure should stay below 10%-15% of revenue. Payment processing is roughly another 3%-5%.

## Conversion ladder

Do not ask visitors to pay before they have seen their own face or character in motion.

1. Visitor enters the studio with no card.
2. They receive **3 watermarked trial creations**.
3. First successful output triggers an email or sign-in prompt to save it.
4. A fourth render, watermark removal, HD/4K export, or permanent storage triggers the upgrade offer.
5. A 100-credit pay-as-you-go pack is available alongside subscriptions.

The current app enforces this ladder server-side:

- The anonymous session is HttpOnly.
- The trial counter is persisted in SQLite, not localStorage.
- Device and IP hashes prevent a simple cookie reset from creating unlimited trials.
- Signing in preserves the trial already used on that browser.
- Stripe webhooks add credits only after payment is confirmed.

Typical early-stage expectation is not instant payment. A healthier benchmark is:

- 20%-35% of qualified visitors start the free editor
- 35%-55% of starters complete one successful generation
- 8%-18% of activated trial users buy within 30 days
- repeat creators account for most subscription revenue

These are planning assumptions, not guarantees. Track them from day one.

## Referral design

- The invited user must complete a first successful generation.
- Both sides get 4 credits after that event.
- Monthly reward cap: 40 credits per account.
- Require a verified sign-in before payout.
- Limit creation of multiple accounts from the same device or payment identity.
- Never pay the reward for registration alone.

This produces a real activation event, not fake sign-ups, while keeping acquisition cost below most paid-social alternatives.

## Recommended launch tiers

### Discover

- $0
- 3 trial creations
- watermark
- standard queue
- 7-day library

### Creator

- $14/month
- 150 credits
- no watermark
- permanent library
- commercial use

### Studio

- $49/month
- 600 credits
- team library
- priority queue
- higher concurrency

### Pay as you go

- $10 for 100 credits
- best for occasional creators who reject subscriptions

## Metrics that must ship with version one

- landing visit
- studio entry
- upload started
- upload completed
- generate clicked
- generation completed
- result downloaded
- sign-in prompt shown
- upgrade modal shown
- checkout started
- checkout completed
- referral link copied
- referred user activated
