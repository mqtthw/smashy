# Smashy

**[smashy.gg](https://smashy.gg)** is a free home for the Super Smash Bros. community: locals near you, live
brackets, player results, every major since 2003, clips, guides for new players, and a place to find someone to
play. It has no ads and doesn't sell data. It's also on [iPhone](https://apps.apple.com/app/smashy-locals-brackets/id6835023055)
and [Android](https://play.google.com/store/apps/details?id=gg.smashy.app).

Smashy is a community project. It isn't affiliated with or endorsed by Nintendo.

## Run it locally

You need Node.js (LTS) and Git.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Pages that read the database need a Supabase project of your own: copy `.env.example` to `.env.local` and fill in
what you need (each line says where the value comes from). The database schema is in `supabase/migrations/`; apply
it to your project with the Supabase CLI (`supabase db push`). Pages that don't need the database (for example
`/privacy`) also run with placeholder settings:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=dummy npx next dev
```

## Checks

```bash
npm run typecheck
npm run lint
npm test
```

## How it's built

- [Next.js](https://nextjs.org) (App Router) with TypeScript and Tailwind CSS
- [Supabase](https://supabase.com) for the database and sign-in, with row-level security rules in `supabase/migrations/`
- Tournament data from [start.gg](https://start.gg) and [parry.gg](https://parry.gg); clips from Twitch and YouTube
- The store apps (`apps/mobile`) are a [Capacitor](https://capacitorjs.com) shell around the website
- Hosted on [Vercel](https://vercel.com)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). To report a security problem privately, see [SECURITY.md](SECURITY.md).

## License

Smashy's code is free software under the [GNU Affero General Public License v3.0](LICENSE): you can use, change and
share it, and if you run a changed copy as a website, you must offer its source to the people who use it.

Not covered by that license:

- **Character stock icons** in `public/stock/`: characters and designs © Nintendo / HAL Laboratory; the rips are
  credited in [public/stock/CREDITS.txt](public/stock/CREDITS.txt).
- **The Smashy name and logo** (`assets/logo/`): please don't use them for a different site or app.
- **Fonts and other third-party files** keep their own licenses (see the README or LICENSE next to them).
