// The player's "your set" card (a scoreboard) on a hosted event's page and its live bracket: who they play and
// where (online: the opponent's connect code under it), or that their reported result is waiting on the TO. While they're needed, the tab title says
// so too ("⚔️ Your set is up · …"). One component so the two pages can't drift apart.
import Link from "next/link";
import Scoreboard from "./Scoreboard";
import TitlePrefix from "./TitlePrefix";
import CopyButton from "@/components/ui/CopyButton";
import Icon from "@/components/ui/Icon";
import { T } from "@/lib/i18n/client";

/** How the card looks (also shown on the design page): the scoreboard with what to do next under it. */
export function YourSetCard({ opponent, setup, reported, className = "" }: { opponent: string; setup: string | null; reported: boolean; className?: string }) {
  return (
    <Scoreboard label={<T k="entering.yourSet" />} status={reported ? "reported" : "ready"} left={{ name: <T k="entering.you" /> }} right={{ name: opponent }} className={className}>
      <span className="text-sm text-muted">
        {reported ? (
          <T k="entering.reportedWaiting" />
        ) : setup ? (
          <>
            <Icon name="pin" /> <T k="entering.playOn" /> <b className="text-foreground">{setup}</b>
          </>
        ) : (
          <T k="entering.strikeOrReport" />
        )}
      </span>
      <span className={`btn btn-md w-full ${reported ? "btn-outline" : "btn-inverse"}`}>{reported ? <T k="entering.seeMySet" /> : <T k="entering.openMySet" />}</span>
    </Scoreboard>
  );
}

export default function MySetButton({
  setId,
  opponent,
  setup,
  reported,
  opponentCode,
  className = "",
}: {
  setId: string;
  opponent: string;
  setup: string | null;
  reported: boolean;
  /** Online events: the opponent's connect code (null: not added yet). Leave out to show no code line. */
  opponentCode?: string | null;
  className?: string;
}) {
  return (
    <>
      <Link href={`/host/set/${setId}`} className={`block rounded-2xl transition-opacity hover:opacity-90 ${className}`}>
        <YourSetCard opponent={opponent} setup={setup} reported={reported} />
      </Link>
      {!reported && opponentCode !== undefined && (
        <p className="-mt-1 flex flex-wrap items-center justify-center gap-2 text-sm text-muted">
          {opponentCode ? (
            <>
              <span>
                <Icon name="globe" /> <T k="entering.opponentCode" values={{ name: opponent }} />
              </span>
              <code className="font-mono font-semibold text-foreground">{opponentCode}</code>
              <CopyButton text={opponentCode} />
            </>
          ) : (
            <span>
              <Icon name="globe" /> <T k="entering.noOpponentCode" values={{ name: opponent }} />
            </span>
          )}
        </p>
      )}
      {!reported && <TitlePrefix k="entering.titleYourSet" />}
    </>
  );
}
