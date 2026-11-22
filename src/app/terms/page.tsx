import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { ContactLine, OperatorLine } from "@/components/LegalPage";
import NewTab from "@/components/ui/NewTab";

export const metadata: Metadata = { title: "Terms", description: "The rules for using Smashy." };

export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="November 14, 2026">
      <p>By using Smashy (the website or its apps) you agree to these rules. They&apos;re short on purpose.</p>
      <OperatorLine />

      <h2>Accounts</h2>
      <ul>
        <li>You must be 13 or older to make an account, and give your real birthdate.</li>
        <li>One person, one account. Don&apos;t pretend to be someone else (including pros or tournament organizers).</li>
        <li>You&apos;re responsible for what happens on your account.</li>
      </ul>

      <h2>Be a good member of the community</h2>
      <p>Smashy has teen users, so the bar is higher than on most sites. Don&apos;t post or share:</p>
      <ul>
        <li>Harassment, threats, hate, or bullying, including in Play lobbies.</li>
        <li>Sexual content of any kind, or gore.</li>
        <li>Other people&apos;s private information, or contact details meant to move teens off Smashy.</li>
        <li>Spam, scams, cheating services, or anything illegal.</li>
        <li>Content you don&apos;t have the right to share.</li>
      </ul>
      <p>
        Moderators can remove content that breaks these rules, and delete accounts that keep breaking them. Use the
        Report button when you see something wrong.
      </p>

      <h2>Your content</h2>
      <p>
        You own what you post. By posting it, you let Smashy show it on Smashy&apos;s website and apps, in
        notifications, and (for adults&apos; public posts) in link previews and the bracket and results views other
        sites can embed, for as long as it&apos;s up. Delete it any time and it&apos;s gone from Smashy.
      </p>

      <h2>Clips, tournaments and other sites</h2>
      <p>
        Reels plays clips through Twitch&apos;s and YouTube&apos;s own players; those videos belong to their creators
        and follow{" "}
        <a href="https://www.youtube.com/t/terms" className="link" target="_blank" rel="noopener noreferrer">YouTube&apos;s Terms of Service<NewTab /></a>{" "}
        and Twitch&apos;s terms. Tournament information comes from start.gg and parry.gg and may be out of date; check
        the tournament&apos;s own page before you travel or pay.
      </p>

      <h2>Events hosted on Smashy</h2>
      <p>
        Organizers run their own events and set their own rules. Smashy doesn&apos;t take payments: any entry or venue
        fee is between you and the organizer.
      </p>

      <h2>Character icons</h2>
      <p>
        Super Smash Bros. characters and their stock icons are © Nintendo. The Ultimate stock icons Smashy shows next to
        players&apos; names are fan recreations by Max_Hamm (r/smashbros), shared for anyone to use. The Smash 64, Melee,
        Brawl and Smash 4 icons are from The Spriters Resource (ripped by Storice, Cotton Candy 2C and Random Talking
        Bush). Smashy isn&apos;t
        affiliated with or endorsed by Nintendo; if a rights holder asks, we&apos;ll remove them.
      </p>

      <h2>No guarantees</h2>
      <p>
        Smashy is a free community project, provided as is. We do our best to keep it running and accurate, but we
        can&apos;t promise it always will be. Smashy isn&apos;t affiliated with Nintendo.
      </p>
      <p>
        As far as the law allows, Smashy and the people who run it aren&apos;t liable for indirect or consequential
        losses, or for what other people post or do, that come from using Smashy. Nothing here takes away rights the
        law doesn&apos;t let us take away.
      </p>

      <h2>Ending</h2>
      <p>
        You can stop using Smashy and delete your account any time. Smashy can suspend or delete accounts that break
        these rules.
      </p>

      <h2>Law</h2>
      <p>
        These terms are governed by the laws of the State of Texas, USA. If you use the iPhone app, Apple&apos;s
        standard license for App Store apps also applies; Apple isn&apos;t responsible for Smashy or its content.
      </p>

      <h2>Changes and contact</h2>
      <p>
        If these rules change in a meaningful way, we&apos;ll say so on Smashy first. Questions: <ContactLine />. How we
        handle your data is in the <Link href="/privacy" className="link">privacy policy</Link>.
      </p>
    </LegalPage>
  );
}
