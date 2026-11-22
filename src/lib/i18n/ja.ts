// Smashy in Japanese (日本語). House style: natural Japanese as Japanese smash players write it online:
// short UI labels, です/ます for full sentences and help text, no stiff keigo. Scene words in the forms
// Japanese players use (トーナメント/大会, セット, ステージ, キャラ, オンライン, ラダー, etc.); keep
// brand names (Smashy, start.gg, Slippi, Braacket, Challonge, Discord) and game titles as they are.
// Every phrase in en.ts has to be here (TypeScript checks). The main (top-level) keys go first; the
// per-screen phrases are in sections/*.ja.ts.
import type { MessageKey } from "./en";
import type { eventEn } from "./sections/event.en";
import type { enteringEn } from "./sections/entering.en";
import type { setroomEn } from "./sections/setroom.en";
import type { hostsetupEn } from "./sections/hostsetup.en";
import type { hostrunEn } from "./sections/hostrun.en";
import type { hostbracketEn } from "./sections/hostbracket.en";
import type { feedEn } from "./sections/feed.en";
import type { peopleEn } from "./sections/people.en";
import type { playEn } from "./sections/play.en";
import type { browseEn } from "./sections/browse.en";
import type { mediaEn } from "./sections/media.en";
import type { uiEn } from "./sections/ui.en";
import { eventJa } from "./sections/event.ja";
import { enteringJa } from "./sections/entering.ja";
import { setroomJa } from "./sections/setroom.ja";
import { hostsetupJa } from "./sections/hostsetup.ja";
import { hostrunJa } from "./sections/hostrun.ja";
import { hostbracketJa } from "./sections/hostbracket.ja";
import { feedJa } from "./sections/feed.ja";
import { peopleJa } from "./sections/people.ja";
import { playJa } from "./sections/play.ja";
import { browseJa } from "./sections/browse.ja";
import { mediaJa } from "./sections/media.ja";
import { uiJa } from "./sections/ui.ja";
import { alertJa } from "./sections/alert.ja";
import { seasonJa } from "./sections/season.ja";
import { leagueJa } from "./sections/league.ja";
import { historyJa } from "./sections/history.ja";
import { playnowJa } from "./sections/playnow.ja";
import type { alertEn } from "./sections/alert.en";
import type { seasonEn } from "./sections/season.en";
import type { leagueEn } from "./sections/league.en";
import type { historyEn } from "./sections/history.en";
import type { playnowEn } from "./sections/playnow.en";

type SectionKey = keyof typeof eventEn | keyof typeof enteringEn | keyof typeof setroomEn | keyof typeof hostsetupEn | keyof typeof hostrunEn | keyof typeof hostbracketEn | keyof typeof feedEn | keyof typeof peopleEn | keyof typeof playEn | keyof typeof browseEn | keyof typeof mediaEn | keyof typeof uiEn | keyof typeof alertEn | keyof typeof seasonEn | keyof typeof leagueEn | keyof typeof historyEn | keyof typeof playnowEn;

const main: Record<Exclude<MessageKey, SectionKey>, string> = {
  // Language switch
  "lang.label": "言語",
  "lang.note": "投稿と名前は書かれたまま表示されます。",

  // Profile (guest)
  "profile.guestTitle": "あなたのプロフィール",
  "profile.guest": "ゲストとして閲覧中です。",
  "profile.guestBody": "無料アカウントを作ると、プレイヤー名の設定、地元シーンのフォロー、大会成績の表示ができます。",

  // Main menu
  "nav.main": "メイン",
  "nav.home": "Smashy ホーム",
  "nav.feed": "フィード",
  "nav.discuss": "掲示板",
  "nav.events": "大会",
  "nav.reels": "リール",
  "nav.play": "対戦",
  "nav.messages": "メッセージ",
  "nav.new": "初心者向け",
  "nav.profile": "プロフィール",
  "nav.skip": "本文へスキップ",

  // Common
  "common.continue": "続ける",
  "common.cancel": "キャンセル",
  "common.save": "保存",
  "common.saving": "保存中…",
  "common.close": "閉じる",
  "common.back": "戻る",
  "common.yes": "はい",
  "common.no": "いいえ",
  "common.offline": "Smashy に接続できませんでした。通信環境を確認して、もう一度お試しください。",
  "common.tryAgain": "保存できませんでした。もう一度お試しください。",
  "common.signInFirst": "先にログインしてください。",
  "common.showMore": "さらに {n} 件表示",
  "common.copy": "コピー",
  "common.copied": "コピーしました",
  "common.period": "。",

  // Getting started (keys match src/lib/discovery.ts)
  "checklist.picture": "プロフィール画像を追加する",
  "checklist.mains": "メインキャラを選ぶ",
  "checklist.bio": "短い自己紹介を書く",
  "checklist.follow": "プレイヤーを3人フォローする",
  "checklist.startgg": "start.gg を連携して成績を表示する",
  "checklist.post": "フィードであいさつする",
  "discover.alsoIn": "{place}にもいます",
  "discover.playsYourGames": "同じゲームをプレイ",

  // Event formats
  "format.double_elim": "ダブルエリミネーション",
  "format.single_elim": "シングルエリミネーション",
  "format.round_robin": "総当たり",
  "format.swiss": "スイス式",
  "format.then": "{first}、その後上位{n}人で{second}",

  // Sharing an event
  "share.postToFeed": "フィードに投稿",
  "share.posting": "投稿中…",

  // Videos on a set
  "vods.title": "動画",
  "vods.ofThisSet": "このセットの動画",
  "vods.all": "すべての VOD →",
  "vods.add": "+ このセットの動画を追加",
  "vods.linkLabel": "動画のリンク",
  "vods.placeholder": "https://youtu.be/…（できれば開始時間付きで）",
  "vods.addButton": "追加",
  "vods.adding": "追加中…",
  "vods.help": "YouTube、Twitch（VOD またはクリップ）、Streamable に対応しています。このセットの動画だけにしてください。誰でも見られます。",
  "vods.notYet": "対応サイトの動画リンクではないようです。",
  "vods.removeConfirm": "この動画をセットから削除しますか？",
  "vods.remove": "削除",
  "vods.removing": "削除中…",

  // Reporting something to moderators
  "report.button": "通報",
  "report.spam": "スパム",
  "report.harassment": "嫌がらせ・いじめ",
  "report.inappropriate": "不適切な内容",
  "report.offTopic": "スマブラと関係ない",
  "report.other": "その他",
  "report.done": "通報しました。ありがとうございます！",
  "report.failed": "通報できませんでした。",

  // Sign-in
  "signin.title": "参加する",
  "signin.pageTitle": "Smashy に参加",
  "signin.intro": "投稿したり、地元のシーンをフォローしたり、成績を見せたりできます。閲覧はアカウントなしでいつでも無料です。",
  "signin.tooYoung": "ごめんなさい、まだアカウントを作れません。",
  "signin.tooYoungBody": "Smashy のアカウントは13歳以上の方が対象です。大会などはゲストとしてそのまま閲覧できます。",
  "signin.browseEvents": "大会を見る →",
  "signin.discord": "Discord で続ける",
  "signin.google": "Google で続ける",
  "signin.apple": "Apple で続ける",
  "signin.appleFailed": "Apple でログインできませんでした。もう一度試すか、メールを使ってください。",
  "signin.discordBeta": "ベータ期間中はこちらがおすすめです。メールのログインリンクは届くまで時間がかかることがあります。",
  "signin.discordReady": "一番早い方法です。メールのリンクでもログインできます。届かない場合は迷惑メールフォルダを確認してください。",
  "signin.quickWays": "ワンタップでメールを待たずに入れる、一番早い方法です。メールのリンクでもログインできます。届かない場合は迷惑メールフォルダを確認してください。",
  "signin.agreeBefore": "参加すると、次に同意したものとみなされます:",
  "signin.terms": "利用規約",
  "signin.and": "と",
  "signin.privacy": "プライバシーポリシー",
  "signin.wrongBirthday": "誕生日を間違えて入力しましたか？",
  "signin.inviteSaved": "招待コード {code} を保存しました。下からログインすると自動で入力されます。",
  "signin.privateBeta": "Smashy は招待制のベータ版です。参加するには、すでに使っている人からの招待コードが必要です。",
  "signin.birthday": "誕生日はいつですか？",
  "signin.birthdayNote": "全員にお聞きしています。誕生日がプロフィールに表示されることはありません。",
  "signin.month": "月",
  "signin.day": "日",
  "signin.year": "年",
  "signin.checkEmail": "メールを確認してください",
  "signin.sentTo": "{email} にログインリンクとコードを送りました。この端末でリンクを開くか、下にコードを入力してください。",
  "signin.codeLabel": "またはメールのコードを入力",
  "signin.codeSubmit": "ログイン",
  "signin.badCode": "コードが正しくないようです。ログインメールに書かれた数字です。",
  "signin.codeFailed": "そのコードは使えませんでした。最新のログインメールと見比べてください。コードは1時間後、または一度使うと無効になります。",
  "signin.cantFind": "見つかりませんか？",
  "signin.spamHelp": "迷惑メールやプロモーションのフォルダを確認してください。送信元は {from} です。「迷惑メールではない」に設定すると、次から受信トレイに届きやすくなります。",
  "signin.err.banned": "Smashyのルール違反により、このアカウントは停止されています。間違いだと思う場合は {email} までメールしてください。",
  "signin.err.expired": "このログインリンクは期限切れか、すでに使われています。下から新しいリンクを送ってください。",
  "signin.err.rate": "ログイン用のメールが短時間に送られすぎました。1分待ってからもう一度お試しください。",
  "signin.err.failed": "ログインできませんでした。もう一度試すか、下の別の方法を使ってください。",
  "signin.err.inUse": "そのアカウントはすでに別のSmashyアカウントにつながっています。そちらを使うには、一度ログアウトしてからそのアカウントでログインしてください。",
  "people.signin.title": "ログイン方法",
  "people.accounts.title": "アカウント",
  "people.accounts.note": "Xのように、この端末でSmashyのアカウントを切り替えられます。最大{n}件。",
  "people.accounts.switch": "切り替え",
  "people.accounts.add": "アカウントを追加",
  "people.accounts.forget": "@{handle}をこの端末から削除",
  "people.accounts.full": "この端末に保存できるのは{n}件までです。追加するには1件削除してください。",
  "people.accounts.savedTitle": "この端末のアカウント",
  "people.accounts.continueAs": "{name}として続ける",
  "people.accounts.switchLink": "アカウントを切り替え",
  "people.accounts.switchTo": "@{handle}に切り替え",
  "people.signin.note": "ログイン方法をもう一つつないでおくと、片方が使えなくなってもログインできます。",
  "people.signin.connect": "{name}をつなぐ",
  "people.signin.added": "{name}をつなぎました。これからは{name}でもログインできます。",
  "people.signin.changeEmail": "メールアドレスを変更",
  "people.signin.newEmail": "新しいメールアドレス",
  "people.signin.sendLinks": "リンクを送る",
  "people.signin.emailSent": "あと少しです。{old} と {new} の両方にリンクを送りました。両方を開くと変更されます。",
  "people.signin.emailPending": "{new} への変更を待っています。両方のアドレスに送ったリンクを開いてください。",
  "people.signin.emailHalf": "1つ目のリンクを確認しました。もう一方のアドレスに送ったリンクを開くと {new} に変わります。",
  "people.signin.emailChanged": "メールアドレスが {email} になりました。",
  "people.signin.sameEmail": "それはすでに今のメールアドレスです。",
  "people.signin.emailInUse": "そのメールアドレスは別のSmashyアカウントで使われています。",
  "signin.sendAgain": "もう一度送る",
  "signin.sendAgainIn": "{s}秒後にもう一度送れます",
  "signin.otherEmail": "別のメールアドレスを使う",
  "signin.emailLabel": "またはメールでログインリンクを受け取る",
  "signin.sendLink": "リンクを送る",
  "signin.badDate": "正しい日付を選んでください。",
  "signin.badEmail": "有効なメールアドレスを入力してください。",
};

export const ja: Record<MessageKey, string> = {
  ...main,
  ...eventJa,
  ...enteringJa,
  ...setroomJa,
  ...hostsetupJa,
  ...hostrunJa,
  ...hostbracketJa,
  ...feedJa,
  ...peopleJa,
  ...playJa,
  ...browseJa,
  ...mediaJa,
  ...uiJa,
  ...alertJa,
  ...seasonJa,
  ...leagueJa,
  ...historyJa,
  ...playnowJa,
};
