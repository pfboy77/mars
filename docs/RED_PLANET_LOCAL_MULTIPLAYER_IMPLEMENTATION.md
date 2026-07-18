# Red Planet Companion
# ローカル通信マルチプレイ実装ガイド

更新日: 2026-07-12
対象リポジトリ: `/Users/pfboy/develop/mars`

---

## 1. 目的

既存のRed Planet Companionに、同じWi-Fi・同じローカルネットワーク上でゲーム状態を共有できる機能を追加する。

複数人がそれぞれの端末から参加し、以下をリアルタイムに確認できるようにする。

- 各プレイヤーの資源量
- 各プレイヤーの産出量
- TR
- 接続状態
- 最終更新時刻
- 必要に応じてUndo / Redoの結果

クラウドDBや有料バックエンドは使用しない。
Firebase、Supabase、CloudKit、AWS、Render、Vercel Functionsなどの外部サーバーへゲーム状態を保存しない。

---

## 2. 基本方針

### 2.1 MVPの構成

最初のMVPでは、ゲーム参加者のうち1人がMacまたはPC上でローカルサーバーを起動する。

```text
同じWi-Fi
│
├── Mac / PC
│   └── Node.js + TypeScript ローカルサーバー
│
├── iPhone A
│   └── SwiftUIネイティブアプリ
│
├── iPhone B
│   └── SwiftUIネイティブアプリ
│
└── Webブラウザ
    └── 既存Reactアプリ
```

サーバーはゲーム状態の唯一の正本とする。

- クライアントは直接状態を確定しない
- クライアントは「操作」をサーバーへ送る
- サーバーが操作を検証して状態を更新する
- サーバーが最新状態を全クライアントへ配信する

### 2.2 通信方式

リアルタイム同期にはWebSocketを使用する。

理由:

- iOSの`URLSessionWebSocketTask`から接続できる
- Webブラウザの標準`WebSocket` APIから接続できる
- 同一プロトコルをiOSとWebで共有できる
- ポーリングより通信量と遅延を抑えやすい

### 2.3 永続化

MVPではDBを使わず、次のどちらかとする。

1. インメモリのみ
2. ローカルJSONファイルへ自動保存

推奨は2。

```text
server/data/sessions/<session-id>.json
```

保存時は一時ファイルへ書き込んでからrenameし、途中で壊れにくい形にする。

`server/data/`はGit管理しない。

---

## 3. 非目標

初期実装では以下を行わない。

- インターネット越しの接続
- ユーザーアカウント
- メール認証
- SNSログイン
- クラウドDB
- 課金
- 広告
- WebView
- Capacitor
- Cordova
- Firebase
- Supabase
- CloudKit同期
- P2Pの複雑なNAT越え
- iPhoneをバックグラウンド常駐サーバーにすること
- 同一ゲームを複数サーバーで分散管理すること

---

## 4. 既存構成を維持する

既存のWeb版とネイティブiOS版を壊さない。

想定構成:

```text
mars/
├── ios/
│   └── teraformingmars2/
├── server/
├── protocol/
├── src/
├── public/
├── docs/
└── README.md
```

新規実装の推奨構成:

```text
mars/
├── protocol/
│   ├── schemas/
│   │   ├── client-message.schema.json
│   │   ├── server-message.schema.json
│   │   ├── game-state.schema.json
│   │   └── session.schema.json
│   ├── fixtures/
│   │   ├── create-session.json
│   │   ├── join-session.json
│   │   ├── update-resource.json
│   │   └── game-state.json
│   └── PROTOCOL.md
│
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── protocol.ts
│   │   ├── websocketServer.ts
│   │   ├── sessionManager.ts
│   │   ├── gameReducer.ts
│   │   ├── persistence.ts
│   │   ├── validation.ts
│   │   └── logger.ts
│   ├── tests/
│   │   ├── sessionManager.test.ts
│   │   ├── gameReducer.test.ts
│   │   └── websocket.integration.test.ts
│   └── data/
│
├── ios/
│   └── teraformingmars2/
│       ├── Networking/
│       │   ├── LocalServerClient.swift
│       │   ├── WebSocketTransport.swift
│       │   ├── MultiplayerModels.swift
│       │   ├── MultiplayerMessageCodec.swift
│       │   └── ConnectionState.swift
│       ├── Multiplayer/
│       │   ├── MultiplayerLobbyView.swift
│       │   ├── JoinGameView.swift
│       │   ├── SharedGameView.swift
│       │   └── PlayerResourceSummaryView.swift
│       └── Domain/
│
└── src/
    ├── multiplayer/
    │   ├── client.ts
    │   ├── protocol.ts
    │   ├── store.ts
    │   └── reconnect.ts
    └── ...
```

---

## 5. サーバー技術

### 必須

- Node.js
- TypeScript
- `ws`
- JSON SchemaまたはZod/Ajvによる入力検証
- VitestまたはNode test runner
- npm

### 推奨

```json
{
  "dependencies": {
    "ws": "...",
    "zod": "..."
  },
  "devDependencies": {
    "typescript": "...",
    "tsx": "...",
    "vitest": "...",
    "@types/ws": "..."
  }
}
```

バージョンは実装時点の安定版を使用する。
不要な依存を大量に追加しない。

Expressは必須ではない。
ヘルスチェックとWebSocketだけならNodeの`http`と`ws`で十分。

---

## 6. 通信プロトコル

### 6.1 共通ルール

すべてJSONで送受信する。

全メッセージに以下を持たせる。

```json
{
  "type": "message-type",
  "protocolVersion": 1,
  "requestId": "uuid"
}
```

操作メッセージには可能な限り以下も含める。

```json
{
  "sessionId": "session-id",
  "clientId": "client-id",
  "actionId": "uuid",
  "expectedRevision": 12
}
```

### 6.2 revision

ゲーム状態に単調増加する`revision`を持たせる。

```json
{
  "revision": 13
}
```

クライアントは操作送信時に、自分が確認している`expectedRevision`を送る。

サーバー側のrevisionと一致しない場合は、操作を無条件で適用せず、最新スナップショットを返す。

### 6.3 actionId

すべての更新操作にUUIDの`actionId`を付ける。

同じactionIdを再受信した場合、二重適用しない。
再接続やタイムアウト時の再送に耐えられるようにする。

### 6.4 MVPメッセージ一覧

クライアントからサーバー:

- `createSession`
- `joinSession`
- `leaveSession`
- `resumeSession`
- `updateResource`
- `updateProduction`
- `updateTR`
- `runProduction`
- `resetPlayer`
- `ping`

サーバーからクライアント:

- `sessionCreated`
- `sessionJoined`
- `stateSnapshot`
- `actionAccepted`
- `actionRejected`
- `playerJoined`
- `playerLeft`
- `connectionState`
- `pong`
- `error`

---

## 7. データモデル

### 7.1 SessionState

```ts
type SessionState = {
  protocolVersion: 1;
  sessionId: string;
  joinCode: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  hostClientId: string;
  players: PlayerState[];
};
```

### 7.2 PlayerState

既存モデルに合わせて調整する。

```ts
type PlayerState = {
  playerId: string;
  clientId: string;
  displayName: string;
  connected: boolean;
  lastSeenAt: string;
  tr: number;
  resources: ResourceState[];
};
```

### 7.3 ResourceState

```ts
type ResourceState = {
  id: string;
  name: string;
  amount: number;
  production: number;
};
```

### 7.4 クライアント内部情報

秘密にすべき情報や端末固有情報を、全参加者へ配信しない。

配信してよいもの:

- 表示名
- 資源
- 産出量
- TR
- 接続状態

配信しないもの:

- ローカルファイルパス
- デバイス識別子
- Apple ID
- IPアドレスの一覧
- トークンの生値
- デバッグログ全文

---

## 8. セッション作成と参加

### 8.1 MVP

最初は手入力でよい。

ホスト画面に表示:

```text
サーバー: 192.168.1.10
ポート: 8787
参加コード: 482913
```

参加者は以下を入力する。

- ホストIP
- ポート
- 参加コード
- プレイヤー名

### 8.2 次段階

MVP完成後に追加する。

- QRコード
- Bonjour / mDNS
- 最近接続したサーバー
- カスタムURLスキーム
- 自動再接続

QRコードには、短時間だけ有効な参加トークンを含めてもよい。

例:

```text
redplanet://join?host=192.168.1.10&port=8787&session=abc123&token=...
```

トークンをログへ出さない。

---

## 9. サーバーの責務

サーバーは次を担当する。

- セッション作成
- 参加コード生成
- プレイヤー参加
- 重複名の扱い
- 操作の入力検証
- ゲームルールの適用
- revision更新
- actionIdの重複排除
- 最新状態のbroadcast
- 切断検知
- 再接続
- JSON保存
- エラー応答
- ログ出力

クライアントから送られた数値を信用しない。

例:

- 資源量の上限・下限
- 産出量の範囲
- TRの範囲
- 文字列長
- メッセージサイズ
- 1秒あたりの操作回数

すべてサーバー側で確認する。

---

## 10. 状態更新方式

MVPでは、操作成功後に最新の全状態を配信する。

```text
Client
  └── updateResource

Server
  ├── validate
  ├── apply action
  ├── revision++
  ├── save JSON
  └── broadcast stateSnapshot
```

差分配信は後回しにする。
参加人数が数人で状態も小さいため、MVPでは全スナップショットの方が実装と検証が簡単。

---

## 11. Undo / Redo

Undo / Redoを共有ゲームで扱う場合、クライアントごとに独立管理しない。

サーバー側で操作履歴を管理する。

MVPの推奨:

- Undoはホストのみ
- Redoもホストのみ
- 最大20履歴
- Undo / Redo後もrevisionを増やす
- 全クライアントへ最新状態を配信する

プレイヤー単位のUndoが必要なら後続フェーズで設計する。

---

## 12. 再接続

クライアントは以下を保持する。

- `clientId`
- `playerId`
- `sessionId`
- 最新`revision`

切断後は指数バックオフで再接続する。

例:

```text
1秒 → 2秒 → 4秒 → 8秒 → 最大15秒
```

再接続成功時に`resumeSession`を送る。

サーバーは最新`stateSnapshot`を返す。

アプリがバックグラウンドへ移動した場合:

- 接続状態を`disconnected`または`reconnecting`にする
- フォアグラウンド復帰時に再接続する
- バックグラウンド中の常時接続を前提にしない

---

## 13. iOS実装

### 13.1 技術

- SwiftUI
- Observation
- `URLSessionWebSocketTask`
- Codable
- async/await
- MainActor
- KeychainまたはUserDefaultsによる最小限の接続情報保存

### 13.2 状態

```swift
enum MultiplayerConnectionState {
    case disconnected
    case connecting
    case connected
    case reconnecting
    case failed(String)
}
```

ViewModelは最低限以下を持つ。

```swift
@MainActor
@Observable
final class MultiplayerGameViewModel {
    var connectionState: MultiplayerConnectionState
    var session: SessionState?
    var localPlayerId: String?
    var errorMessage: String?
}
```

### 13.3 UI

追加画面:

1. 「ローカルゲーム」
2. 「ゲームに参加」
3. ホストIP・ポート・参加コード入力
4. プレイヤー名入力
5. 接続中表示
6. 参加者一覧
7. 各参加者の資源一覧
8. 自分の資源操作
9. 他プレイヤーは閲覧中心
10. 再接続状態表示

既存オフライン画面は残す。

起動時に必ず通信を要求しない。
オフライン単独プレイとローカル共有プレイを選べるようにする。

### 13.4 Local Network権限

ローカルネットワークアクセスに必要な設定をXcodeプロジェクトへ追加する。

説明文はユーザーが理解できる日本語にする。

例:

```text
同じWi-Fi上のゲーム参加者と資源状況を共有するため、ローカルネットワークを使用します。
```

Bonjourを追加するフェーズでは、使用するサービス種別も設定する。

---

## 14. Web実装

既存Reactアプリにローカル通信モードを追加する。

- 標準WebSocket APIを使用
- iOSと同じJSONメッセージ形式
- 既存オフラインモードを残す
- サーバー切断時にUIへ表示
- 自動再接続
- revision不一致時に最新snapshotを採用
- 同じactionIdを再利用しない

Web版の既存ゲームロジックとサーバー側ゲームロジックが食い違わないようにする。

共有モードではサーバー側を正とし、クライアント側は楽観更新を行わないか、MVPでは最小限にする。

---

## 15. セキュリティ

ローカル専用でも最低限の対策を行う。

- 参加コード
- セッショントークン
- JSONスキーマ検証
- メッセージサイズ上限
- 文字列長上限
- 数値範囲
- rate limit
- 不明なtypeを拒否
- 不正なrevisionを拒否
- 重複actionIdを再適用しない
- パストラバーサル防止
- 任意ファイルパスをクライアント入力から作らない
- シェルコマンドを実行しない
- `eval`を使わない
- 秘密情報をログへ出さない

サーバーはインターネットへ公開しない。
ルーターのポート開放を要求しない。

---

## 16. ログ

通常ログ:

- サーバー起動
- バインドアドレス
- ポート
- セッション作成
- 参加・切断
- action accepted / rejected
- revision
- 保存成功・失敗

ログへ出さない:

- セッショントークン
- QRコードの完全URL
- 個人情報
- UserDefaults / Keychainの中身
- 受信JSON全文の常時出力

---

## 17. テスト

### 17.1 Server Unit Test

- セッション作成
- joinCode生成
- 重複参加
- 資源加算
- 資源減算
- 産出
- TR更新
- reset
- Undo / Redo
- revision更新
- stale revision拒否
- actionId重複排除
- 不正入力拒否
- JSON保存と復元

### 17.2 Integration Test

- 2クライアント接続
- Aの操作がBへ配信される
- Bの操作がAへ配信される
- 切断と再接続
- サーバー再起動後の復元
- 同時操作
- stale revision
- malformed JSON
- oversized message

### 17.3 iOS

- Codec test
- ViewModel test
- 接続状態遷移
- snapshot反映
- actionRejected処理
- 再接続
- オフラインモード維持

### 17.4 Web

- message codec
- reconnect
- snapshot適用
- stale状態の破棄
- UI表示

---

## 18. フェーズ分割

### Phase 0: 現状調査

- リポジトリ構成確認
- 既存GameState / Resource / Reducer確認
- WebとiOSのモデル差分確認
- 既存テスト確認
- 変更予定ファイル一覧作成
- 実装前レポート

この段階ではコードを変更しない。

### Phase 1: 共通プロトコル

- `protocol/PROTOCOL.md`
- JSON Schema
- fixture
- メッセージ型
- revision / actionIdルール
- エラーコード

### Phase 2: ローカルサーバーMVP

- Node + TypeScript
- WebSocket
- SessionManager
- GameReducer
- validation
- in-memory状態
- Unit Test
- 2クライアントintegration test

### Phase 3: JSON永続化

- atomic write
- 起動時復元
- `server/data/`
- 破損ファイル対応
- 保存テスト

### Phase 4: iOS接続

- WebSocketTransport
- Codableモデル
- Lobby
- Join
- SharedGameView
- 再接続
- エラーUI

### Phase 5: Web接続

- React WebSocket client
- shared mode
- reconnect
- player list
- resource summary

### Phase 6: 参加体験

- QRコード
- Bonjour / mDNS
- 最近の接続先
- 入力検証
- 接続案内

### Phase 7: 安定化

- 複数端末実機試験
- Wi-Fi切替
- スリープ
- サーバー再起動
- 操作競合
- ログ整理
- README更新

---

## 19. 最初の実装範囲

最初の作業ではPhase 0からPhase 2までを一気に全部実装しない。

推奨する最初の1回:

1. Phase 0を実施
2. 調査結果を報告
3. Phase 1の設計案と変更ファイル一覧を提示
4. ユーザーの確認後にPhase 1を実装

ただし、ユーザーが明示的に続行を許可した場合はPhase 1まで進めてよい。

---

## 20. 完了条件

MVP完了条件:

- Mac / PCでローカルサーバーを起動できる
- 同じWi-FiのiPhoneから参加できる
- 2人以上が同じセッションへ参加できる
- 各参加者の資源が全員に表示される
- 資源変更が全員へ反映される
- 産出量とTRも共有される
- 切断が表示される
- 再接続後に最新状態へ復帰する
- DBやクラウドサービスを使っていない
- サーバー再起動後にJSONから復元できる
- 既存オフライン機能が壊れていない
- iOSアプリがWebView化されていない
- テストが成功する

---

## 21. 禁止事項

作業者は次を行わない。

- `git commit`
- `git push`
- `git reset --hard`
- `git clean`
- force push
- 既存ファイルの無断削除
- テスト削除によるエラー回避
- Firebase追加
- Supabase追加
- CloudKit追加
- 外部DB追加
- 広告SDK追加
- 課金SDK追加
- WebView追加
- Capacitor追加
- Cordova追加
- 不要な大規模リファクタリング
- 既存Web版の全面書き換え
- 秘密情報のハードコード
- ローカルネットワーク外への公開
- ルーターのポート開放を前提とする実装

---

## 22. 作業ルール

- 一度に1フェーズだけ進める
- 作業前に`pwd`、`git status`、リポジトリルートを確認
- 実ファイルを編集できることを確認
- 全体上書きより最小差分を優先
- 変更前に対象コードを読む
- 変更後に`git diff`を表示
- ビルド・テスト結果を報告
- 失敗時は原因を隠さない
- 書き込み権限がない場合は別コピーを作らず停止
- `/tmp`や別ディレクトリの修正版を本物として扱わない

---

## 23. 各フェーズの報告形式

```text
### 実施したフェーズ

### 調査結果

### 設計判断

### 変更ファイル

### 実装内容

### 実行したコマンド

### Build結果

### Test結果

### 残っている問題

### 次フェーズの提案
```

---

## 24. サーバー起動UXの将来案

MVPではターミナル起動でよい。

```bash
cd server
npm install
npm run dev
```

将来的には、非開発者でも使えるように次を検討する。

- macOSメニューバーアプリ
- Tauri製の小さなホストアプリ
- 「ローカルゲームを開始」ボタン
- QRコード表示
- サーバーログ簡易表示
- ワンクリック停止

ただし、MVP完成前にデスクトップGUIへ広げない。

---

## 25. iPhone単体ホストについて

将来的に、1台のiPhoneをホスト兼クライアントにする案は別フェーズとして扱う。

最初から実装しない理由:

- サーバー実装が複雑になる
- アプリのバックグラウンド移行への対応が必要
- WebSocketサーバー側の実装が増える
- Web版との互換性検証が増える
- MVPの完成が遅くなる

まずNode.jsローカルサーバーで通信仕様を固める。
その後、同じプロトコルに互換性を持つiOSホスト方式を別途検討する。

---

## 26. 最終方針

この機能の中心は「サーバーを無料で立てること」ではなく、次の3点。

1. 同じWi-Fi内だけで完結する
2. サーバーを状態の正本にする
3. iOSとWebが同じプロトコルを使う

最初は小さく、2クライアント間で資源状態が同期できるところまで実装する。
