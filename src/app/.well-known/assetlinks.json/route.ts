// Tells Android that smashy.gg links may open the Smashy app ("App Links"): sign-in emails, shared
// posts, brackets. Android checks it when the app is installed. It lists the SHA-256 fingerprints of
// the keys the app is signed with: Google Play's app signing key (Play Console → Test and release →
// App integrity) and our upload key (scripts/make-upload-key.ps1 prints it). Fingerprints are public,
// not secrets: every app's file is readable by anyone. See docs/store-apps-plan.md step 10.
const PACKAGE = "gg.smashy.app";
const FINGERPRINTS: string[] = [
  // Upload key (CN=Smashy), made 2026-11-15. Builds installed straight from our own .aab/.apk.
  "18:57:85:1D:65:67:B7:8B:46:9F:4A:15:33:C9:A3:34:33:C0:B5:D0:36:A3:2A:4D:46:18:05:56:C1:06:1C:71",
  // Google Play's app signing key (Play Console → App integrity → App signing), 2026-11-15.
  // Everyone who installs from Google Play gets the app signed with this one.
  "9B:62:89:C1:BA:E0:ED:09:6A:6E:4C:53:51:54:71:00:76:80:C4:DA:DD:21:F3:7E:C3:4C:02:36:50:38:95:DB",
];

export function GET() {
  return Response.json(
    FINGERPRINTS.length === 0
      ? []
      : [
          {
            relation: ["delegate_permission/common.handle_all_urls", "delegate_permission/common.get_login_creds"],
            target: { namespace: "android_app", package_name: PACKAGE, sha256_cert_fingerprints: FINGERPRINTS },
          },
        ],
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
