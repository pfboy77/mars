# Protocol Specification

## GameState

The shared game state between Web (React/TypeScript) and iOS (SwiftUI) uses the same JSON schema.

```json
{
  "version": 1,
  "resources": [
    { "id": "...", "name": "...", "amount": 0, "production": 0, "isMegaCredit": false, "isEnergy": false, "isHeat": false }
  ],
  "tr": 20
}
```

## Rules

1. All resources have `id` (unique string), `name`, `amount`, `production`
2. Special resource flags: `isMegaCredit`, `isEnergy`, `isHeat`, `isSteel`, `isTitanium`
3. `tr` (Terraform Rating) is an integer between 0 and 100
4. `version` is a monotonically increasing integer for save data compatibility

## Production Phase

1. Transfer all Energy amount to Heat
2. Clear Energy to 0
3. For each resource: `amount += production + (isMegaCredit ? tr : 0)`

## Undo/Redo

1. Before every mutation, snapshot current GameState into undoStack
2. Pop from undoStack for Undo, pushing current state to redoStack
3. Pop from redoStack for Redo, pushing current state to undoStack

## Save Format

1. Save to UserDefaults (iOS) / localStorage (Web) as JSON string
2. Include `version` field for future migration support

