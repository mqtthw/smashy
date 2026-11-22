# Sign-in email templates

Smashy's emails from Supabase (sign-in link, new account, change email, reset password, verification
code), in Smashy's colors. Made in round 675 by `build.py`; the logo is `public/email/wordmark.png`
(a copy of `assets/logo/wordmark.png`), loaded from https://smashy.gg/email/wordmark.png.

To change them: edit `build.py`, run `python supabase/templates/build.py`, then paste each file into
Supabase → Authentication → Emails → Templates → the matching email → Body (Source), and Save.

| File | Supabase template | Subject |
| --- | --- | --- |
| `magic-link.html` | Magic link or OTP | Your Smashy sign-in link |
| `confirm-signup.html` | Confirm sign up | Your Smashy sign-in link |
| `change-email.html` | Change email address | Confirm your new email address |
| `reset-password.html` | Reset password | Reset your password |
| `reauthentication.html` | Reauthentication | {{ .Token }} is your verification code |

"Invite user" isn't used (Smashy's invites are its own codes) and keeps Supabase's default.

The sign-in button in `magic-link.html` and `confirm-signup.html` goes straight to Smashy's `/auth/callback` with
the one-time token (`{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email`, round 686), so it works in any
browser. The other emails still use `{{ .ConfirmationURL }}`.
