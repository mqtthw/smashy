// Tells iPhones that smashy.gg links may open the Smashy app (Apple "universal links"): sign-in
// emails, shared posts, brackets. Apple reads this once when the app is installed (through its own
// cache), so changes can take a day to reach phones. The app ID is the LLC's Apple team ID plus the
// iPhone app's bundle ID, gg.smashy.ios (gg.smashy.app got claimed by a personal test team; Android
// keeps gg.smashy.app). See docs/store-apps-plan.md. Not a secret: every app's file is public.
import { APPLE_TEAM_ID, IOS_BUNDLE_ID } from "@/lib/iosApp";

const APP_ID = `${APPLE_TEAM_ID}.${IOS_BUNDLE_ID}`;

export function GET() {
  return Response.json(
    {
      applinks: {
        details: [
          {
            appIDs: [APP_ID],
            components: [
              // Machine endpoints and files stay in the browser; every page opens in the app.
              { "/": "/api/*", exclude: true, comment: "server endpoints" },
              { "/": "/.well-known/*", exclude: true },
              { "/": "/*.ics", exclude: true, comment: "calendar feeds belong in the calendar app" },
              { "/": "/host/*/results.json", exclude: true, comment: "results files for ranking tools" },
              { "/": "*" },
            ],
          },
        ],
      },
      // Lets iPhone offer saved smashy.gg passwords and sign-in codes inside the app.
      webcredentials: { apps: [APP_ID] },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
