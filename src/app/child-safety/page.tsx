import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { ContactLine, OperatorLine } from "@/components/LegalPage";
import NewTab from "@/components/ui/NewTab";

// Smashy's published standards against child sexual abuse and exploitation (CSAE). Google Play requires
// this page for apps in the social category (Play Console → App content → Child safety standards);
// it must stay public, not a PDF. Every protection described here must match the code: check the teen
// rules (lib/teens, messaging age bands), photo checks (SafeSearch) and report flow before editing.
export const metadata: Metadata = {
  title: "Child safety standards",
  description: "How Smashy protects young players and handles child sexual abuse and exploitation.",
};

export default function ChildSafetyPage() {
  return (
    <LegalPage title="Child safety standards" updated="November 22, 2026">
      <p>
        Smashy is a community for Super Smash Bros. players, and many of them are teenagers. We do not tolerate
        child sexual abuse or exploitation of any kind. This page explains what is banned, how Smashy is built to
        keep young players safe, and what we do when something is reported.
      </p>
      <OperatorLine />

      <h2>What is banned</h2>
      <ul>
        <li>Child sexual abuse material (CSAM) of any kind, including drawn, edited or AI-made images.</li>
        <li>Grooming: building trust with a minor in order to exploit them, or asking a minor for sexual content, photos or a meeting.</li>
        <li>Sexualizing minors in posts, comments, messages, profiles or usernames.</li>
        <li>Sextortion: threatening to share someone&apos;s images, or pressuring them for more.</li>
        <li>Trying to move a minor to another app or a private channel to get around Smashy&apos;s protections.</li>
      </ul>
      <p>
        Sexual content of any kind is already against Smashy&apos;s <Link href="/terms" className="link">terms</Link>,
        for every age.
      </p>

      <h2>How Smashy protects young players</h2>
      <ul>
        <li>Accounts are for people 13 and older. We ask for a birthdate when someone joins, and accounts we learn belong to someone under 13 are deleted.</li>
        <li>Until an account adds its birthdate, it gets the teen protections and can&apos;t message anyone, send or get play requests, or join the online ladder.</li>
        <li>Teen accounts (13 to 17) are always protected: the teen approves who follows them.</li>
        <li>Teens&apos; profiles and posts are only shown to members who have made a Smashy profile, never to guests or in link previews.</li>
        <li>Any chat that includes a teen takes no photos, from anyone in it, and blocks phone numbers, emails, links and social media handles, to keep contact on Smashy.</li>
        <li>A message from someone a member doesn&apos;t follow back arrives as a request: one message, which they can accept, delete or block. Groups can only include people who follow each other.</li>
        <li>The online ladder only pairs players in the same age group (teens with teens, adults with adults).</li>
        <li>Posts from teens that contain phone numbers, emails or social media handles are blocked, to keep contact on Smashy.</li>
        <li>Every photo uploaded to a post or a message, and still frames from every video, is checked automatically for adult and violent content before anyone else can see it.</li>
        <li>Anyone can block another account, so the two can no longer message or follow each other.</li>
      </ul>

      <h2>Reporting</h2>
      <p>
        Every post, message and profile on Smashy has a menu (⋯) with <b>Report</b>. Reports go to Smashy&apos;s
        moderators. If you see anything that puts a child at risk, report it in the app and also write to{" "}
        <ContactLine /> with &ldquo;Child safety&rdquo; in the subject, so it is handled first. You don&apos;t need an
        account to email us.
      </p>
      <p>
        If a child is in immediate danger, call your local emergency number first. In the United States you can also
        report to the NCMEC CyberTipline at{" "}
        <a href="https://report.cybertip.org" target="_blank" rel="noopener noreferrer" className="link">report.cybertip.org<NewTab /></a>{" "}
        or 1-800-843-5678. Elsewhere, the{" "}
        <a href="https://www.inhope.org/EN" target="_blank" rel="noopener noreferrer" className="link">INHOPE network<NewTab /></a>{" "}
        lists the hotline for your country.
      </p>

      <h2>What we do</h2>
      <ul>
        <li>We review child safety reports before anything else.</li>
        <li>We remove the content and suspend the account involved.</li>
        <li>We keep the evidence the law requires, out of sight of other members.</li>
        <li>We report apparent child sexual abuse material to the National Center for Missing &amp; Exploited Children (NCMEC), as US law requires, and we cooperate with law enforcement.</li>
      </ul>

      <h2>Contact</h2>
      <p>
        Smashy&apos;s contact for child safety is <ContactLine />. We are ready to answer questions from users,
        parents, app stores and law enforcement about these standards and how we follow them.
      </p>
    </LegalPage>
  );
}
