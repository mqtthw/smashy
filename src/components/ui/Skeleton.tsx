// Loading placeholders: grey shapes in the layout of what's coming, so a slow page doesn't jump
// around when it arrives. Pulses gently (not for people who've turned on "reduce motion").
// Screen readers hear one "Loading…" per placeholder instead of the shapes.
import type { ReactNode } from "react";
import { T } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";

/** One grey block. */
export function Bone({ className = "" }: { className?: string }) {
  const corners = /rounded-/.test(className) ? "" : "rounded-md"; // callers can pick other corners (e.g. rounded-full)
  return <span aria-hidden="true" className={`block ${corners} bg-line-strong/60 motion-safe:animate-pulse ${className}`} />;
}

/**
 * Wraps a placeholder. An empty label = part of a bigger placeholder (announced once, by the outer one).
 * No label = the default phrase `k`, in the visitor's language.
 */
function Loading({ label, k = "ui.loading", className = "", children }: { label?: string; k?: MessageKey; className?: string; children: ReactNode }) {
  if (label === "") return <div className={className}>{children}</div>;
  return (
    <div role="status" className={className}>
      <span className="sr-only">{label ?? <T k={k} />}</span>
      {children}
    </div>
  );
}

/** Posts in a feed: avatar, name line, two lines of text, the action row. */
export function FeedSkeleton({ count = 5, label }: { count?: number; label?: string }) {
  return (
    <Loading label={label} k="ui.loading.posts" className="divide-y divide-line">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-3 px-4 py-3">
          <Bone className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <Bone className="h-3 w-1/3" />
            <Bone className={`h-3 ${i % 2 ? "w-5/6" : "w-full"}`} />
            <Bone className={`h-3 ${i % 3 ? "w-2/3" : "w-1/2"}`} />
            <div className="mt-1 flex gap-8">
              <Bone className="h-3 w-8" />
              <Bone className="h-3 w-8" />
              <Bone className="h-3 w-8" />
            </div>
          </div>
        </div>
      ))}
    </Loading>
  );
}

/** A list of cards (events, scenes, rulesets, admin queues). */
export function CardListSkeleton({ count = 4, label, className = "" }: { count?: number; label?: string; className?: string }) {
  return (
    <Loading label={label} className={`flex flex-col gap-3 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 card p-4">
          <Bone className={`h-4 ${i % 2 ? "w-1/2" : "w-2/3"}`} />
          <Bone className="h-3 w-1/3" />
          <Bone className="h-3 w-5/6" />
        </div>
      ))}
    </Loading>
  );
}

/** A list of people (followers, following, search results). */
export function PeopleSkeleton({ count = 6, label }: { count?: number; label?: string }) {
  return (
    <Loading label={label} className="divide-y divide-line">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Bone className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Bone className="h-3 w-1/3" />
            <Bone className="h-3 w-1/4" />
          </div>
          <Bone className="h-8 w-20 rounded-full" />
        </div>
      ))}
    </Loading>
  );
}

/** A profile: header (avatar, name, bio, counts), tabs, then posts. */
export function ProfileSkeleton() {
  return (
    <Loading k="ui.loading.profile">
      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="flex items-start justify-between">
          <Bone className="h-16 w-16 rounded-full" />
          <Bone className="h-9 w-24 rounded-full" />
        </div>
        <Bone className="h-5 w-40" />
        <Bone className="h-3 w-28" />
        <Bone className="h-3 w-3/4" />
        <div className="flex gap-4">
          <Bone className="h-3 w-20" />
          <Bone className="h-3 w-20" />
        </div>
      </div>
      <div className="flex gap-6 border-b border-line px-4 pb-3">
        <Bone className="h-4 w-12" />
        <Bone className="h-4 w-16" />
        <Bone className="h-4 w-12" />
      </div>
      <FeedSkeleton count={3} label="" />
    </Loading>
  );
}

/** A bracket: a few round columns of set boxes. */
export function BracketSkeleton() {
  return (
    <Loading k="ui.loading.bracket" className="flex gap-6 overflow-hidden px-4 py-4">
      {[8, 4, 2, 1].map((n, col) => (
        <div key={col} className="flex w-52 shrink-0 flex-col justify-around gap-3">
          <Bone className="h-3 w-24" />
          {Array.from({ length: n }, (_, i) => (
            <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-line p-2">
              <Bone className="h-3 w-3/4" />
              <Bone className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ))}
    </Loading>
  );
}

/** A set page: the scoreboard, then the talk below it. */
export function SetSkeleton() {
  return (
    <Loading k="ui.loading.set" className="flex flex-col">
      <div className="flex flex-col gap-4 px-4 py-4">
        <Bone className="h-3 w-1/2" />
        <div className="flex items-center justify-between gap-4 card p-4">
          <div className="flex flex-1 flex-col gap-2">
            <Bone className="h-5 w-2/3" />
            <Bone className="h-3 w-1/3" />
          </div>
          <Bone className="h-8 w-16" />
          <div className="flex flex-1 flex-col items-end gap-2">
            <Bone className="h-5 w-2/3" />
            <Bone className="h-3 w-1/3" />
          </div>
        </div>
        <Bone className="aspect-video w-full rounded-xl" />
      </div>
      <FeedSkeleton count={2} label="" />
    </Loading>
  );
}

/** A clip page / the Reels player: a video-shaped box and a title. */
export function ClipSkeleton({ full = false }: { full?: boolean }) {
  return (
    <Loading k="ui.loading.clip" className={full ? "flex h-full items-center justify-center bg-black p-4" : "flex flex-col gap-3 px-4 pt-4"}>
      <Bone className={`aspect-video w-full rounded-xl ${full ? "max-w-xl opacity-30" : ""}`} />
      {!full && (
        <>
          <Bone className="h-5 w-2/3" />
          <Bone className="h-3 w-1/3" />
        </>
      )}
    </Loading>
  );
}

/** A plain page or form: a few lines and blocks. */
/** A set on Smashy while it loads: the header lines, then the scoreboard's shape (two names, the score between). */
export function ScoreboardSkeleton() {
  return (
    <Loading k="ui.loading.set" className="flex flex-col gap-4 py-2">
      <Bone className="h-3 w-24" />
      <Bone className="h-7 w-2/3" />
      <div className="board flex flex-col gap-3 p-4">
        <div className="flex justify-end">
          <Bone className="h-5 w-14 rounded-full" />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div className="flex flex-col gap-1.5">
            <Bone className="h-8 w-8 rounded-full" />
            <Bone className="h-5 w-3/4" />
          </div>
          <Bone className="h-9 w-20" />
          <div className="flex flex-col items-end gap-1.5">
            <Bone className="h-8 w-8 rounded-full" />
            <Bone className="h-5 w-3/4" />
          </div>
        </div>
      </div>
      <Bone className="h-24 w-full rounded-xl" />
    </Loading>
  );
}

export function PageSkeleton({ label }: { label?: string }) {
  return (
    <Loading label={label} className="flex flex-col gap-3 py-2">
      <Bone className="h-6 w-1/2" />
      <Bone className="h-3 w-5/6" />
      <Bone className="h-3 w-2/3" />
      <Bone className="mt-2 h-24 w-full rounded-xl" />
      <Bone className="h-24 w-full rounded-xl" />
    </Loading>
  );
}
