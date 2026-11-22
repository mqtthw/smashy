# Builds Smashy's sign-in email templates (round 675). Run: python supabase/templates/build.py
# Writes one .html per email next to this file; paste each into Supabase → Authentication → Emails →
# Templates (the subject lines are listed in README.md). Email apps ignore most modern CSS, so this is
# tables and inline styles on purpose, with plain colors behind every gradient.
from pathlib import Path

HERE = Path(__file__).parent
LOGO = "https://smashy.gg/email/wordmark.png"

INK = "#2a0b0a"
MUTED = "#7a4842"
BLUSH = "#fbe7e3"
RED = "#c4170c"
FONT = "'Source Sans 3','Segoe UI',Helvetica,Arial,sans-serif"


def button(url_var: str, label: str) -> str:
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 4px">
  <tr><td align="center" bgcolor="{RED}" style="border-radius:999px;background:{RED};background-image:linear-gradient(180deg,#ff8a7c 0%,#e8301f 50%,#c4170c 51%,#e8402f 100%);box-shadow:0 2px 6px rgba(196,23,12,0.35)">
    <a href="{url_var}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:{FONT};font-size:17px;font-weight:700;line-height:20px;color:#ffffff;text-decoration:none;border-radius:999px;text-shadow:0 1px 1px rgba(80,0,0,0.35)">{label}</a>
  </td></tr>
</table>"""


def code_box(intro: str) -> str:
    return f"""<p style="margin:22px 0 8px;font-family:{FONT};font-size:14px;line-height:20px;color:{MUTED};text-align:center">{intro}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto">
  <tr><td align="center" bgcolor="#fff6f4" style="padding:12px 22px;border:1px solid #f1c9c1;border-radius:12px;background:#fff6f4">
    <span style="font-family:Consolas,'SF Mono',Menlo,monospace;font-size:28px;font-weight:700;letter-spacing:6px;color:{INK}">{{{{ .Token }}}}</span>
  </td></tr>
</table>"""


def page(preheader: str, title: str, lead: str, middle: str, ignore: str) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background:{BLUSH}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:{BLUSH}">{preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{BLUSH}" style="background:{BLUSH};background-image:linear-gradient(180deg,#f7d4cc 0%,{BLUSH} 260px)">
  <tr><td align="center" style="padding:28px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;border-radius:20px;overflow:hidden;background:#ffffff;border:1px solid #f1c9c1;box-shadow:0 8px 24px rgba(120,30,20,0.12)">
      <tr><td align="center" bgcolor="#a80f0c" style="padding:26px 20px 22px;background:#a80f0c;background-image:linear-gradient(180deg,#4a0707 0%,#a80f0c 55%,#de2416 100%)">
        <a href="https://smashy.gg" target="_blank" style="text-decoration:none"><img src="{LOGO}" width="200" height="53" alt="SMASHY" style="display:block;border:0;width:200px;height:53px;color:#ffffff;font-family:Georgia,serif;font-size:32px;font-weight:900"></a>
      </td></tr>
      <tr><td style="padding:30px 28px 26px">
        <h1 style="margin:0 0 10px;font-family:{FONT};font-size:24px;line-height:30px;font-weight:800;color:{INK};text-align:center">{title}</h1>
        <p style="margin:0 0 20px;font-family:{FONT};font-size:16px;line-height:23px;color:{MUTED};text-align:center">{lead}</p>
{middle}
        <p style="margin:26px 0 0;padding-top:18px;border-top:1px solid #f6dcd6;font-family:{FONT};font-size:13px;line-height:19px;color:{MUTED};text-align:center">{ignore}</p>
      </td></tr>
    </table>
    <p style="margin:18px 0 0;font-family:{FONT};font-size:12px;line-height:18px;color:{MUTED};text-align:center">
      <a href="https://smashy.gg" target="_blank" style="color:{RED};font-weight:700;text-decoration:none">smashy.gg</a> · the Smash community's home for events, results, clips and friends
    </p>
  </td></tr>
</table>
</body>
</html>
"""


# Round 686: the button goes straight to Smashy's /auth/callback with the one-time token, which works in any
# browser. {{ .ConfirmationURL }} went through Supabase and finished with a code only the browser that asked
# for the link could use, so a link requested on a computer and opened on a phone failed. RedirectTo is the
# emailRedirectTo the site sends (".../auth/callback?next=/welcome"), so the token is added with "&".
SIGN_IN_URL = "{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email"

SIGN_IN = page(
    "Your sign-in link and code for Smashy.",
    "Sign in to Smashy",
    "Tap the button to finish signing in. The link works once and expires soon.",
    button(SIGN_IN_URL, "Sign in to Smashy") + "\n" + code_box("Or type this code in Smashy:"),
    "Didn't ask for this? You can ignore this email; nobody can sign in without it.",
)

TEMPLATES = {
    # Magic link and Confirm sign up send the same thing: new players get the confirm one.
    "magic-link.html": SIGN_IN,
    "confirm-signup.html": SIGN_IN,
    "change-email.html": page(
        "Confirm your new email address for Smashy.",
        "Confirm your new email",
        "Tap the button to use <strong style=\"color:" + INK + "\">{{ .NewEmail }}</strong> for signing in to Smashy.",
        button("{{ .ConfirmationURL }}", "Confirm new email"),
        "Didn't ask for this? You can ignore this email and nothing changes.",
    ),
    "reset-password.html": page(
        "Choose a new password for Smashy.",
        "Reset your password",
        "Tap the button to choose a new password. The link works once and expires soon.",
        button("{{ .ConfirmationURL }}", "Choose a new password"),
        "Didn't ask for this? You can ignore this email; your password stays the same.",
    ),
    "reauthentication.html": page(
        "Your Smashy verification code.",
        "Your verification code",
        "Type this code in Smashy to confirm it's you. It expires soon.",
        code_box("Your code:"),
        "Didn't ask for this? You can ignore this email.",
    ),
}

for name, html in TEMPLATES.items():
    (HERE / name).write_text(html, encoding="utf-8", newline="\n")
print("wrote", ", ".join(TEMPLATES))
