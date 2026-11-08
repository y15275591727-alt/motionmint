# MotionMint

MotionMint is a polished character-motion creation studio built around a provider adapter for the Viggle API.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Without `VIGGLE_API_KEY`, the app runs in demo mode and simulates asynchronous jobs. Add the key to `.env` to enable real Video Remix, text-to-video, and image generation.

## Accounts, trials, and billing

- The backend uses a persistent SQLite database in `data/`.
- Mix and Motion Control include four built-in motion presets. A user can generate from one character photo; uploading a custom motion video overrides the selected preset.
- Every anonymous browser receives three server-enforced trial renders. The limit uses an HttpOnly session plus a device/IP usage key.
- Email/password registration is included.
- Google OAuth activates when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.
- EVM wallet sign-in uses a signed challenge and activates when the user has a browser wallet.
- Stripe Checkout is used for credit packs and subscriptions. Configure the three Stripe environment variables and a webhook to credit paid accounts.
- Referral codes are generated server-side. Credits are awarded only after the invited account creates a first job, with a 40-credit monthly cap.
- The local operations dashboard is available at `/#admin`. Its token is generated in `data/admin-token.txt`, or can be fixed with `ADMIN_TOKEN`.
- The public customer gallery is available at `/#community`, with category filters, detail pages, prompts, model metadata and tracked downloads.
- The signed-in Studio library follows the account across sessions and restores saved prompts, aspect ratios, resolutions and finished media.
- Generated image and video downloads are proxied through the app, so signed-in users can export from the original job instead of depending on temporary provider URLs.
- The admin Gallery tab can create, edit, feature, publish, unpublish and configure downloads for gallery items.
- The admin Settings tab controls site name, hero title, support email, trial limit, registrations, public gallery visibility and watermark behavior.

Useful environment values are documented in `.env.example`. Never place private keys in frontend code.

### Stripe setup

1. Create recurring USD prices in Stripe for Creator and Studio.
2. Put their `price_...` IDs in `STRIPE_PRICE_CREATOR` and `STRIPE_PRICE_STUDIO`.
3. Set `STRIPE_SECRET_KEY`.
4. Add a webhook to `/api/stripe/webhook` and subscribe to `checkout.session.completed` and `invoice.paid`.
5. Put the webhook signing secret in `STRIPE_WEBHOOK_SECRET`.

The included one-off pack sells 100 credits for $10. Subscription credits are applied after checkout and renewed on monthly `invoice.paid` events.

## Product principles

- English-first UI with a Chinese companion toggle.
- Three free trial generations without a card.
- Referral reward is released only after the invited user completes a first generation.
- Credits are task-priced so API costs, storage, payment fees, and support stay profitable.

## API adapter

The browser never sees the Viggle key. `server/viggle.js` forwards uploaded files to:

- `POST /v1/renders` for character + motion video
- `POST /v1/videos` for text/reference-to-video
- `POST /v1/images` for image generation

The frontend polls `GET /api/jobs/:id`; the server translates Viggle's async job lifecycle into a stable MotionMint response.

## Important production steps

- Put the app behind HTTPS and set `COOKIE_SECURE=true`.
- Replace the local SQLite file with managed Postgres when running more than one server instance.
- Add email verification before referral payouts.
- Add Stripe's customer portal for cancellation and plan management.
- Add object storage for persistent source files and generated outputs.
- Add moderation and content-consent checks before enabling public sharing.
