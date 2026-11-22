import { describe, expect, it } from "vitest";
import { eventJsonLd } from "@/lib/eventSchema";

describe("eventJsonLd", () => {
  it("describes online and in-person events, and escapes < so it can't end the script tag", () => {
    const online = JSON.parse(eventJsonLd({ name: "Netplay </script> #3", url: "https://x/host/1", startIso: "2026-11-10T02:00:00Z", online: true }));
    expect(online.location["@type"]).toBe("VirtualLocation");
    expect(online.eventAttendanceMode).toContain("Online");
    expect(eventJsonLd({ name: "</script>", url: "u", startIso: "s", online: true })).not.toContain("</script>");
    const local = JSON.parse(eventJsonLd({ name: "Local", url: "u", startIso: "s", online: false, venueName: "The Lounge", address: "1 Main St", canceled: true }));
    expect(local.location).toEqual({ "@type": "Place", name: "The Lounge", address: "1 Main St" });
    expect(local.eventStatus).toContain("Cancelled");
  });
});
