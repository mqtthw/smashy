# Security

If you find a security problem in Smashy (for example a way to read someone's private messages, see a teen's
hidden profile, or act as another player), please **don't open a public issue**. Email
**smashy.help@gmail.com** with what you found and how to reproduce it, or use GitHub's private
"Report a vulnerability" button on this repository.

You'll get a reply as soon as we can. Please give us a reasonable time to fix it before talking about it publicly,
and don't access or change other people's data beyond what's needed to show the problem.

## A note on filters

Smashy's word and contact-info filters (`src/lib/wordFilter.ts`, `src/lib/guardrails.ts` and the matching database
rules) are public along with the rest of the code. They're a first line only: reports, blocks and moderators are
what keep the community safe.
