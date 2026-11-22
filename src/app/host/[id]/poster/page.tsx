// A printable poster for the venue: the event's name and time, and a big QR code that opens its
// page, where players sign up and check in on their phones. One sheet of paper on the door or the
// TO desk gets a whole room signed up. Only shows what the event page already shows to everyone.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import QRCode from "qrcode";
import PrintButton from "@/components/host/PrintButton";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { GAMES } from "@/lib/games";
import { getHostedEvent, formatSummary } from "@/lib/hostedEvents";
import { siteUrl } from "@/lib/siteMeta";
import { getLang, getT } from "@/lib/i18n/server";
import { localeFor } from "@/lib/i18n/core";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.poster"), robots: { index: false, follow: false } };
}

async function Poster({ params }: { params: PageProps<"/host/[id]/poster">["params"] }) {
  const { id } = await params;
  const [event, t, lang] = await Promise.all([getHostedEvent(id), getT(), getLang()]);
  if (!event || event.removed || event.status === "canceled") notFound();
  const link = `${siteUrl().origin}/host/${event.id}`;
  // Made on the server from the event's own address (markup from the qrcode library).
  const qr = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
  let when = "";
  try {
    // In the TO's own language: the poster is printed from their account and taped up at their venue.
    when = new Intl.DateTimeFormat(localeFor(lang), { timeZone: event.timezone, weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(event.startsAt));
  } catch {
    when = "";
  }
  const steps = [
    t("event.poster.step1"),
    t("event.poster.step2"),
    t(event.checkinMinutes > 0 ? "event.poster.step3CheckIn" : "event.poster.step3Done"),
    t("event.poster.step4"),
  ];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-4 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={`/host/${event.id}`} className="text-sm text-muted hover:text-foreground">← {event.name}</Link>
        <PrintButton />
      </div>
      <p className="text-sm text-muted print:hidden">{t("event.poster.help")}</p>

      {/* Always black on white, whatever the theme: it's going on paper. */}
      <section className="flex flex-col items-center gap-5 rounded-2xl border border-line bg-white px-6 py-8 text-center text-black print:rounded-none print:border-0 print:py-0">
        <p className="text-sm font-semibold uppercase tracking-widest text-neutral-600">{GAMES[event.game].name}</p>
        <h1 className="text-4xl font-black leading-tight print:text-5xl">{event.name}</h1>
        <p className="text-lg">
          {when}
          {!event.online && event.location ? <><br />{event.location}</> : null}
        </p>
        <p className="text-neutral-600">{formatSummary(event, t)} · {t("event.details.bestOf", { n: event.bestOf })}</p>

        <div className="w-64 max-w-full print:w-[9cm]" role="img" aria-label={t("event.poster.qr")} dangerouslySetInnerHTML={{ __html: qr }} />
        <p className="text-2xl font-bold">{t(event.checkinMinutes > 0 ? "event.poster.scanCheckIn" : "event.poster.scan")}</p>
        <p className="break-all font-mono text-sm text-neutral-600">{link.replace(/^https?:\/\//, "")}</p>

        <ol className="flex max-w-md flex-col gap-1 text-left text-base">
          {steps.map((s, i) => (
            <li key={s} className="flex gap-2">
              <span className="font-bold">{i + 1}.</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-neutral-600">{t("event.poster.noPhone")}</p>
        <p className="text-sm font-semibold text-neutral-600">{t("event.poster.footer")}</p>
      </section>
    </div>
  );
}

export default function PosterPage(props: PageProps<"/host/[id]/poster">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Poster params={props.params} />
    </Suspense>
  );
}
