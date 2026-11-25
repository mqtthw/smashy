// Smash history: the community's documentaries (Matthew, 2026-11-19: "The smash documentary and metagame ...
// deserve to belong on the history page"). Linked to the filmmaker's own pages, where they're watched; facts
// only (year, what each covers), in Smashy's own words.
import NewTab from "@/components/ui/NewTab";
import { T } from "@/lib/i18n/client";

const FILMS = [
  { title: "The Smash Brothers", years: "2013", about: <T k="history.docs.smashBrothers" />, href: "https://www.eastpointpictures.com/thesmashbrothers" },
  { title: "Metagame", years: "2020", about: <T k="history.docs.metagame" />, href: "https://www.eastpointpictures.com/metagame" },
];

export default function Documentaries() {
  return (
    <section aria-labelledby="history-docs" className="flex flex-col gap-2">
      <h2 id="history-docs" className="font-bold"><T k="history.docs.title" /></h2>
      <ul className="card divide-y divide-line">
        {FILMS.map((f) => (
          <li key={f.title} className="px-4 py-2.5">
            <a href={f.href} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
              {f.title} ↗︎<NewTab />
            </a>
            <span className="text-meta text-muted"> · {f.years}</span>
            <p className="text-sm text-muted">{f.about}</p>
          </li>
        ))}
      </ul>
      <p className="text-meta text-muted"><T k="history.docs.credit" /></p>
    </section>
  );
}
