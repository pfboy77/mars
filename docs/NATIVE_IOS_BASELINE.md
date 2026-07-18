# NATIVE_IOS_BASELINE

## 作成日
2026-07-12

## フェーズ
Phase 0 — 既存リポジトリの調査とベースライン作成

---

## 1. リポジトリ概要

| 項目 | 値 |
|------|-----|
| リポジトリ | `pfboy77/red-planet-companion` |
| ローカルパス | `/Users/pfboy/Documents/mars` |
| 状態 | **未コミット** (empty repo) |
| ブランチ | `main` |

---

## 2. 既存Web版 (Red Planet Companion)

### 場所
`/Users/pfboy/移行/terraform-ui/`

### 技術スタック
| 項目 | バージョン |
|------|-----------|
| React | 19.1.0 |
| TypeScript | 4.9.5 |
| 開発環境 | Create React App 5.0.1 |
| ローカルストレージ | `localStorage` |

### ゲーム仕様

**6つの資源 (Resource)**:

| 資源名 | 英語名 | 備考 |
|--------|--------|------|
| MC | Mega Credit | `isMegaCredit: true` |
| 建材 | Steel | |
| チタン | Titanium | |
| 植物 | Plants | |
| 電力 | Energy | `isEnergy: true` |
| 発熱 | Heat | `isHeat: true` |

**ゲーム状態 (GameState)**:
```typescript
interface GameState {
  resources: Resource[];  // 資源一覧
  tr: number;              // Terraform Rating
}
```

**主要機能**:
- 資源の加算/減算（＋/−ボタン + 入力フィールド）
- 生産フェーズ（Energy → Heat 変換 + 生産量加算）
- TR (Terraform Rating) 調整（＋/−）
- Undo / Redo
- `localStorage` への自動保存
- Reset

**初期状態**:
```json
{
  "resources": [
    { "name": "MC", "amount": 0, "production": 0, "isMegaCredit": true },
    { "name": "Steel", "amount": 0, "production": 0 },
    { "name": "Titanium", "amount": 0, "production": 0 },
    { "name": "Plants", "amount": 0, "production": 0 },
    { "name": "Energy", "amount": 0, "production": 0, "isEnergy": true },
    { "name": "Heat", "amount": 0, "production": 0, "isHeat": true }
  ],
  "tr": 20
}
```

---

## 3. 既存iOS版 (teraformingmars)

### 場所
`/Users/pfboy/移行/mars/teraformingmars/`

### 技術スタック
| 項目 | 値 |
|------|-----|
| UI | SwiftUI |
| 言語 | Swift |
| 最低デプロイターゲット | iOS 18.4 |
| ボンジュールID | `hoshino.teraformingmars` |
| Development Team | `XK5LT394GN` |
| テストターゲット | あり (Tests, UITests) |

### 現在の状態
- **Xcodeテンプレートのまま**（"Hello, world!"）
- ゲームロジック、保存、UIコンポーネントは **未実装**
- 6つの資源のデータ構造、Undo/Redo、保存処理はなし

### ファイル一覧
```
teraformingmars/
├── teraformingmarsApp.swift    (メインアプリ — 最小構成)
├── ContentView.swift           (ViewController — "Hello, world!")
├── Assets.xcassets/            (アセット)
├── terformingmarsTests/        (テストターゲット — 空)
└── terformingmarsUITests/      (UIテストターゲット — 空)
```

---

## 4. 指示書 (NATIVE_IOS_LOCAL_MULTIPLAYER_INSTRUCTIONS.md) 照合

### 現状と指示書の乖離

| 指示書の内容 | 現状 | 対応 |
|-------------|------|------|
| 既存Web版を確認 | Web版は `/Users/pfboy/移行/terraform-ui/` に存在 | ✅ 調査完了 |
| iOS版のSwiftUI実装 | skeletonのみの状態 | ❌ 実装必要 |
| ローカルマルチプレイサーバー | 未作成 | 将来フェーズ |
| protocol/fixtures | 未作成 | 将来フェーズ |
| Undo/Redo | iOS未実装 | iOS実装必要 |
| JSON保存 | iOS未実装 | iOS実装必要 |

### 重要事項

1. **Web版とiOS版は別プロジェクト** — 現在のiOS版(skeleton)はWeb版をリファクタリングするものではない
2. **iOS版は0からのSwiftUI実装** が必要
3. **Web版のゲームロジックをiOSに移植** する形になる
4. **現在の共通初期値** — TRは20、全資源量・全産出量は0
5. **指示書のPhase 0 (調査) は完了**

---

## 5. 次のステップ

Phase 1に進むには、以下の順序で進める:

1. **Web版のゲームロジックを抽出** — 純粋Swiftへ移植可能な形式で設計
2. **iOS基本プロジェクトの整備** — 既存skeletonをベースに拡張
3. **Domain層の実装** — Game Model, Reducer, Undo/Redo
4. **UI層の実装** — SwiftUIでの資源管理画面
5. **保存機能の実装** — JSON + Application Support
6. **Unit Testの実装** — Web版と同じfixtureで検証

---

*作成者: Codex*
*日付: 2026-07-12*
