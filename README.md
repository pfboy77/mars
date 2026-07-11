# Red Planet Companion

Red Planet Companion is a fan-made single-player strategy board game companion built for Mars Terraforming theme.

## Project Structure

```
red-planet-companion/
├── src/                           # Web版 (React/TypeScript)
├── ios/
│     └── terformingmars2/         # iOS SwiftUI アプリ
│           ├── terformingmars2.xcodeproj/
│           ├── terformingmars2/   # Swift ソース
│           ├── terformingmars2Tests/
│           └── terformingmars2UITests/
├── protocol/
│     ├── schemas/                 # 共通JSON Schema
│     └── fixtures/                # 検証用フィクスチャ
├── server/                        # ローカルマルチプレイサーバー（将来）
│     ├── src/
│     └── test/
├── docs/                          # ドキュメント
│     ├── NATIVE_IOS_BASELINE.md
│     └── ...
└── README.md
```

## Features

- Single-player resource management
- Terraform Rating tracking
- Resource production phase
- Undo / redo support
- Local network multiplayer (future)

## Tech Stack

### Web (src/)
- React 19
- TypeScript 4.9
- Create React App 5

### iOS (ios/teraformingmars2/)
- SwiftUI
- Swift 5
- iOS 15.6+

## Getting Started

### Web
```bash
cd src
npm install
npm start
```

### iOS
```bash
open ios/teraformingmars2/teraformingmars2.xcodeproj
```

## Disclaimer

This project is an unofficial fan-made application for educational and non-commercial purposes.

## License

MIT
