// Japanese for ./playnow.en.ts: every key there needs one here (TypeScript checks).
import type { playnowEn } from "./playnow.en";

export const playnowJa: Record<keyof typeof playnowEn, string> = {
  "playnow.title": "今すぐ対戦",

  "playnow.req.incoming": "{who}さんが今すぐ{game}で対戦したがっています",
  "playnow.req.outgoing": "{who}さんの返事を待っています（{game}）",
  "playnow.req.ready": "{who}さんは{game}の対戦準備OK",
  "playnow.req.minsLeft": "残り1分|残り{n}分",
  "playnow.req.accept": "対戦する",
  "playnow.req.decline": "今はやめておく",
  "playnow.req.cancel": "申し込みを取り消す",
  "playnow.req.theirCode": "{who}さんのコード：",
  "playnow.req.noCode": "{who}さんはまだこのゲームのコードを保存していません。",
  "playnow.req.messageThem": "メッセージを送る",
  "playnow.req.saveYours": "相手が見つけられるように、下に自分のコードを保存しましょう。",

  "playnow.ask.button": "対戦を申し込む",
  "playnow.ask.buttonGame": "{game}で対戦を申し込む",
  "playnow.ask.game": "ゲーム",
  "playnow.ask.sent": "申し込みました！相手は15分以内に返事できます。",

  "playnow.card.loading": "読み込み中…",
  "playnow.card.profile": "プロフィールを見る",

  "playnow.ping.on": "@matchmaking通知オン",
  "playnow.ping.off": "@matchmaking通知を受け取る",
  "playnow.ping.help": "{game}のチャットで誰かが@matchmakingと書くか、あなたのメインキャラをタグ付けしたら、スマホに通知します",
  "playnow.ping.hint": "@matchmakingで対戦相手を探している全員に、@とキャラ名（例：@Fox）でそのキャラ使いに通知できます。",
  "playnow.ping.sent": "対戦相手を探している全員に通知しました。",
  "playnow.ping.cooldown": "メッセージを送りました。通知は30分に1回までです。",
  "playnow.ping.suggest": "タグの候補",
  "playnow.ping.sentMain": "{chars}使いで対戦相手を探している人に通知しました。",

  "playnow.looking.start": "{game}の対戦相手を募集中にする",
  "playnow.looking.for": "期間",
  "playnow.looking.mins": "{n}分",
  "playnow.looking.hours": "1時間|{n}時間",
  "playnow.looking.on": "フレンドに「{game}の対戦相手募集中」と表示中。終了：",
  "playnow.looking.stop": "やめる",
  "playnow.looking.note": "相互フォローの人に表示。自動でオフになります。",

  "playnow.code.placeholder": "自分のコード",
  "playnow.code.save": "保存",
  "playnow.code.saved": "保存しました。",
  "playnow.code.note": "OKした相手にだけ表示されます。",

  "playnow.friends.title": "フレンド",
  "playnow.friends.none": "まだフレンドがいません。相互フォローになるとここに表示されます。",
  "playnow.friends.looking": "{game}の対戦相手募集中",

  "playnow.slippi.open": "Slippiを開く",
  "playnow.slippi.title": "このパソコンでSlippi Launcherを開き、コードをコピーします",
  "playnow.slippi.how": "WebサイトからSlippiにコードを渡すことはできません。MeleeでOnline→Directを選び、コードを入力してください。",

  "playnow.notif.ping": "{who}さんが{game}のチャットで対戦相手を探しています",
  "playnow.notif.pingMain": "{who}さんが{game}のチャットで{character}との対戦を探しています",
  "playnow.notif.request": "{who}さんが今すぐ{game}で対戦したがっています",
  "playnow.notif.accepted": "{who}さんが{game}の対戦をOKしました",
  "playnow.alert.ping": "{who}さんが{game}の対戦相手を探しています",
  "playnow.alert.pingBody": "タップしてチャットを開く",
  "playnow.alert.pingMain": "{who}さんが{character}との対戦を探しています",
  "playnow.alert.request": "{who}さんが今すぐ{game}で対戦したがっています",
  "playnow.alert.requestBody": "タップして返事をする（15分で終了）",
  "playnow.alert.accepted": "{who}さんは{game}の対戦準備OK",
  "playnow.alert.acceptedBody": "タップしてコードを見る",
  "playnow.settings.requests": "対戦の申し込み",

  "playnow.err.alreadyAsked": "申し込み済みです。数分待ってください。",
  "playnow.err.tooMany": "申し込みが多すぎます。少し時間をおいてください。",
  "playnow.err.cantAsk": "このプレイヤーには申し込めません。",
  "playnow.err.ended": "この申し込みは終了しました。",
  "playnow.err.failed": "うまくいきませんでした。もう一度試してください。",
};
