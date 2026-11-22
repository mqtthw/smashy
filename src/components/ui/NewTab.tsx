// Inside a link that opens in a new tab: says so to screen readers (sighted visitors see the tab
// open), in the reader's language. Works in server and client components.
import { T } from "@/lib/i18n/client";

export default function NewTab() {
  return (
    <span className="sr-only">
      {" "}
      <T k="ui.newTab" />
    </span>
  );
}
