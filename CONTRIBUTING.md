# Contributing to Smashy

Thanks for helping! Smashy is built for the whole smash community, from first-time players to top players, so
contributions of every size are welcome: a missing local, a broken page, a translation fix, or a new feature.

## Ways to help without code

- **Suggest something** on the site: [smashy.gg/help](https://smashy.gg/help) (a missing scene, guide, channel or
  major).
- **Report a bug**: open an issue with what you did, what you expected, and what happened (a screenshot helps).

## Changing the code

1. Fork the repository and make a branch.
2. Keep each change to one thing.
3. Run the checks: `npm run typecheck`, `npm run lint`, `npm test`. Add a unit test in `tests/unit` for new logic.
4. Open a pull request saying what changed and how you checked it.

### Things to know

- **Plain words.** Smashy is read by players, not developers. Write the words people see the way a player would
  say them, and keep them short.
- **Languages.** Text people see lives in `src/lib/i18n` (English, Spanish, French and Japanese). Add new phrases
  in all four. If you change English phrases used in browser code, regenerate the browser's copy with
  `UPDATE_EN_CLIENT=1 npx vitest run tests/unit/enClient.test.ts`.
- **Database changes** go in a new file in `supabase/migrations/` (a timestamp after the newest one). Every table
  has row-level security; grant only the columns a feature needs.
- **Younger players.** Smashy is for ages 13 and up, and teen accounts have extra protection (no contact details on
  profiles, no messages between teens and adults, hidden from people who aren't signed in). New features must keep
  those rules.
- **No authoritative claims.** Smashy links to community guides, VODs and frame data rather than rating matchups
  or declaring "the answer".
- **Secrets** never go in the code, an issue or a pull request. `.env.local` is ignored by git.

## License

By contributing, you agree that your contribution is licensed under the
[GNU Affero General Public License v3.0](LICENSE), like the rest of Smashy's code.
