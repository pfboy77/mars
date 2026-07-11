# iOS Architecture

## プロジェクト構成

```
mars/
├── ios/
│         └── terformingmars2/
│              ├── Domain/
│              │      ├── GameModel.swift
│              │      └── GameReducer.swift
│              ├── ContentView.swift
│              ├── terformingmars2App.swift
│              ├── terformingmars2.xcodeproj/
│              ├── terformingmars2Tests/
│              └── terformingmars2UITests/
├── protocol/
│         ├── schemas/
│         └── fixtures/
├── src/
├── server/
└── docs/
```

## Domain 層

- `GameModel.swift`: データモデル (Resource, GameState)
- `GameReducer.swift`: 純粋関数によるゲームロジック

### 設計原則

1. ゲームロジックは UI に依存しない
2. 全関数は純粋関数 (副作用なし)
3. State は immutable (変更時は常に新しいインスタンス)
4. Undo/Redo はスナップショットベース

## Architecture

```
ContentView (UI)
       ↓
GameViewModel (@Observable)
       ↓
GameReducer (Pure Functions)
       ↓
UserDefaults (Persistence)
```

## 保存形式

- JSON 形式で UserDefaults に保存
- `version: 1` を含める
- 将来の migration を想定

## テスト

- Unit Test: `GameReducer` の全関数
- UI Test: 基本的な画面表示
- Web版の fixture と同じ JSON で検証
