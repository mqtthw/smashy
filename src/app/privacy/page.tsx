import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { ContactLine, OperatorLine } from "@/components/LegalPage";
import NewTab from "@/components/ui/NewTab";

export const metadata: Metadata = { title: "Privacy policy", description: "What Smashy collects, why, who else is involved, and how to delete it." };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="November 18, 2026">
      <p>
        Smashy is a free community site for Super Smash Bros. players. This page explains, in plain words, what we
        collect, why, who else is involved, and how you can delete it. We don&apos;t sell your data, and we don&apos;t
        show ads.
      </p>
      <OperatorLine />

      <h2>Who can use Smashy</h2>
      <p>
        Accounts are for people 13 and older. When you join we ask for your birthdate to check this; if you&apos;re
        under 13 you can still browse as a guest, but you can&apos;t make an account. If we learn that someone under 13
        made an account, we delete it. If you&apos;re a parent and think your child under 13 has an account, write
        to <ContactLine /> and we&apos;ll delete it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Sign-in:</b> your email address (if you sign in with an emailed link or code), your Discord account ID and email (if you sign in with Discord), or your Apple account ID and email (if you sign in with Apple in the iPhone app; Apple may give us a private relay address instead of your real one).</li>
        <li><b>Your birthdate:</b> kept private. Nobody else sees it; we use it to check your age and to apply teen protections.</li>
        <li><b>Your profile:</b> your tag, @handle, the games you play, your mains, your region, your city, bio and crew or college if you add them, links to your Twitch, YouTube, X, Instagram, Bluesky or Reddit if you add them, whether you&apos;re looking for a doubles partner, and your profile picture if you upload one (checked automatically, like post photos).</li>
        <li><b>What you post:</b> posts, replies, photos, videos, reactions, likes, reposts, highlights, upvotes, comments on clips and sets, clips you share to Reels, and messages in Play lobbies.</li>
        <li><b>Who you follow</b>, who you block or mute, the posts and clips you save, your muted words, and the scenes you join. Blocks, mutes, muted words and saved items are private to you.</li>
        <li><b>Poll votes:</b> which choice you picked, so you can only vote once. Others only see the totals, never who voted for what.</li>
        <li><b>Events you&apos;re going to</b> (&ldquo;I&apos;m going&rdquo;): private. Others see how many people are going and which of the people you follow each other with (in your age group) are going. We use it to send you a reminder the day before.</li>
        <li><b>Events hosted on Smashy</b>, if you enter one: your entry, check-in, seed, sets and results (shown on the event&apos;s page and bracket). The organizers can also keep a private checklist of who has paid their entry or venue fee; Smashy doesn&apos;t handle money.</li>
        <li><b>Rough location, for visitors:</b> to show events near someone who isn&apos;t signed in, we use the country and state their internet address points to, as our hosting provider reports it. We don&apos;t store it. Signed-in members pick their own region.</li>
        <li><b>Invites:</b> which invite code you joined with, and the codes you make for friends (so admins can see who invited whom during the beta).</li>
        <li><b>Your settings</b>, like which notifications you want.</li>
        <li><b>Notification addresses:</b> when you turn notifications on, the address your browser or phone gives us for sending them (one per device). Turning notifications off deletes it, and one that stops working (say, the app was removed) is deleted the next time we send.</li>
        <li><b>Messages:</b> your direct and group messages (text and photos) and reactions, kept until you or a moderator deletes them. Only the people in the chat can read them. Smashy staff look at a message only if someone in the chat reports it (the report includes the few messages before it). &ldquo;Typing…&rdquo; and &ldquo;Seen&rdquo; are sent live to the people in the chat and aren&apos;t stored.</li>
        <li><b>Your start.gg link</b>, if you connect it: your start.gg player ID, tag and results, used to show your tournament history and sets. If you don&apos;t have a Smashy picture yet, we copy your start.gg profile picture (after the same safety check); you can change or remove it any time.</li>
        <li><b>Reports</b> you send about posts, clips or chats, and moderators&apos; decisions.</li>
        <li><b>Visit counts:</b> Vercel Web Analytics counts page views: which page, the site that sent you there, your country, and your device and browser type. It uses no cookies and doesn&apos;t identify you or follow you to other sites; we only see totals. Vercel Speed Insights likewise measures how fast pages load (timings, the page, device type), with no cookies.</li>
        <li><b>Error reports:</b> when a page breaks, we record the error message and the page address so we can fix it. They don&apos;t include your account or what you typed.</li>
        <li><b>On your device only:</b> your theme choice and which Reels clips you&apos;ve watched (so you see new ones first) are kept in your browser, not on our servers. We use one cookie to keep you signed in, and one to remember your age check while you join. No tracking or advertising cookies.</li>
      </ul>

      <h2>Teens (13 to 17)</h2>
      <ul>
        <li>Teen accounts are always <b>protected</b>: you approve who follows you.</li>
        <li>Teens&apos; profiles and posts are only visible to people who are signed in, never to guests or in link previews.</li>
        <li>Posts with phone numbers, emails or social handles are blocked for teens, to keep contact on Smashy.</li>
        <li>Teens can only message other teens (13 to 17), and adults only adults. Anyone you don&apos;t follow each other with can send one message request, which you can accept, delete or block.</li>
        <li>Every uploaded photo, in posts and in messages, is checked automatically before anyone can see it (see below).</li>
      </ul>

      <h2>Photos and videos</h2>
      <p>
        When you add a photo to a post, we make a smaller copy and remove the hidden information inside the file
        (like camera details and the GPS location phone photos often include). The copy is checked by Google Cloud
        Vision&apos;s SafeSearch to block adult, suggestive or gory images; Google processes the image for that check.
        Videos on posts (up to 60 seconds) are re-saved the same way, which drops hidden details like where a phone
        video was filmed, and four still frames from each go through the same check.
        Photos in messages are kept private: only people in that chat get a link, and it expires after an hour.
        Post photos are stored with a long random file name. Like any image on the web, someone who has a photo&apos;s
        exact address can open it, so only post photos you&apos;re OK sharing.
      </p>

      <h2>Who else is involved</h2>
      <ul>
        <li><b>Supabase</b> stores Smashy&apos;s database, photos and sign-ins.</li>
        <li><b>Vercel</b> hosts the website, keeps short technical logs (like errors) and counts visits and measures page speed (Web Analytics and Speed Insights, no cookies).</li>
        <li><b>Gmail</b> (Google) sends Smashy&apos;s sign-in emails.</li>
        <li><b>Discord</b>, if you sign in with Discord, and <b>Apple</b>, if you sign in with Apple. Discord servers that add the Smashy bot also get the event and bracket updates their organizers choose to post there.</li>
        <li><b>Google Firebase</b> (Android app) and <b>Apple</b> (iPhone app) deliver notifications to your phone. They get the notification&apos;s text and your phone&apos;s notification address.</li>
        <li><b>start.gg and parry.gg</b> provide tournament, bracket and results information.</li>
        <li><b>Google Cloud Vision</b> checks uploaded photos and video frames.</li>
        <li><b>Google Cloud Translation</b> translates a post or clip caption when you tap Translate; that text is sent to Google.</li>
        <li><b>YouTube</b> plays YouTube Shorts in Reels (through its privacy-enhanced player). YouTube&apos;s use of data is covered by the <a href="https://policies.google.com/privacy" className="link" target="_blank" rel="noopener noreferrer">Google Privacy Policy<NewTab /></a>; by watching, you agree to the <a href="https://www.youtube.com/t/terms" className="link" target="_blank" rel="noopener noreferrer">YouTube Terms of Service<NewTab /></a>. Smashy uses YouTube API Services to find Shorts.</li>
        <li><b>Twitch</b> plays Twitch clips and streams, under Twitch&apos;s own privacy policy.</li>
      </ul>
      <p>These services only get what they need to do their job.</p>

      <h2>What&apos;s public</h2>
      <p>
        An adult&apos;s profile, posts, photos and highlights can be seen by anyone, including guests and search
        engines. A teen&apos;s are visible only to signed-in Smashy users. Your birthdate, email and reports are never
        public.
      </p>

      <h2>Your choices and rights</h2>
      <p>
        You can see and change what&apos;s on your profile any time, download a copy of your data, and delete your
        account (below). For anything else, like a question about what we hold or a request to correct something
        you can&apos;t edit yourself, write to <ContactLine />; we answer within 30 days. We don&apos;t sell or share
        your personal information for advertising.
      </p>

      <h2>Getting a copy of your data</h2>
      <p>
        Go to <Link href="/profile" className="link">Profile</Link> → Download my data for one file with everything Smashy keeps
        about your account.
      </p>

      <h2 id="delete">Deleting your data</h2>
      <p>
        You can delete any post at any time. To delete your whole account and everything in it, go to{" "}
        <Link href="/profile/delete" className="link">Profile → Delete account</Link>. It happens right away. Scenes
        and rulesets you started stay up (other people use them) without your name, and clips you shared that were
        approved for Reels stay up without your name. If you signed in with Apple, we also tell Apple to end
        Smashy&apos;s link with your Apple ID. Copies in our database provider&apos;s backups disappear on their
        own as the backups are replaced.
      </p>

      <h2>Questions</h2>
      <p>Write to <ContactLine />. If we change this policy in a meaningful way, we&apos;ll say so on Smashy first.</p>
    </LegalPage>
  );
}
