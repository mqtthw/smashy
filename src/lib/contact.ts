// Smashy's public contact address: on /privacy and /terms and in the store listings. Not a secret.
// NEXT_PUBLIC_CONTACT_EMAIL can still override it.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "smashy.help@gmail.com";

// The address sign-in emails come from (Resend since round 667; set in Supabase's SMTP settings).
export const SIGNIN_SENDER = "signin@send.smashy.gg";

// Who runs Smashy and who publishes its store apps, named on /privacy and /terms (Matthew, 2026-11-15).
// With either set to null, those pages leave the sentence out.
export const OPERATOR_NAME: string | null = "Matthew Smith";
export const APP_PUBLISHER: string | null = "Pelagos LLC";

// The Smashy Discord server (made 2026-11-15 on the Smashy Discord account): a permanent invite that
// lands on #welcome. Shown on /about and /profile.
export const DISCORD_INVITE = "https://discord.gg/BYU7dudbg";

// The store apps (launch day, 2026-11-17): iPhone and iPad on the App Store (live 2026-11-16) and
// Android on Google Play (live 2026-11-17). Shown by components/GetTheApp on the website only.
export const APP_STORE_URL = "https://apps.apple.com/app/smashy-locals-brackets/id6835023055";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=gg.smashy.app";
