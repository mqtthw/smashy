"use client";
// "Find a player" above long standings: hides the rows whose name doesn't match, as you type.
import { useState } from "react";

export default function StandingsFilter({ target, label, none }: { target: string; label: string; none: string }) {
  const [empty, setEmpty] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <input
        type="search"
        aria-label={label}
        placeholder={label}
        autoComplete="off"
        className="field"
        onChange={(e) => {
          const q = e.target.value.trim().toLowerCase();
          let shown = 0;
          for (const row of document.querySelectorAll<HTMLElement>(`#${target} [data-player]`)) {
            const match = !q || (row.dataset.player ?? "").includes(q);
            row.hidden = !match;
            if (match) shown++;
          }
          setEmpty(shown === 0);
        }}
      />
      {empty && <p role="status" className="text-sm text-muted">{none}</p>}
    </div>
  );
}
