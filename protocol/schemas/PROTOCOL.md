# Red Planet Companion — Common Communication Protocol

**Version**: v1.0.0
**Created**: 2026-07-13
**Applicable to**: iOS (SwiftUI) and Web (React/TypeScript)

---

## 1. Overview

This document defines the JSON Schema-based communication protocol between
clients (iOS, Web) and the local WebSocket server (Node.js).

All messages use JSON. WebSocket frames carry single JSON objects.
No binary, no protocol buffers, no custom encoding.

The server is the single source of truth. Clients only send **actions**
and receive **results** and **state snapshots**.

---

## 2. Protocol Version

The protocol uses a version string:

```
protocolVersion: "v1"
```

New versions may be introduced in future phases.
Clients must reject messages with an unknown `protocolVersion`.

---

## 3. Data Models

### 3.1 SessionState

Represents a multiplayer game session on the server.

| Field | Type | Description |
|-------|------|-------------|
| `protocolVersion` | string | Protocol version string. Fixed to `"v1"` |
| `sessionId` | string (UUID) | Unique session identifier |
| `joinCode` | string | 6-character uppercase code for clients to join (e.g., `"A7B2C9"`) |
| `revision` | integer | Monotonically increasing integer. Starts at 0 |
| `createdAt` | string (ISO 8601 date-time) | Session creation timestamp |
| `updatedAt` | string (ISO 8601 date-time) | Last update timestamp |
| `hostClientId` | string (UUID) | Client ID of the session host |
| `players` | array of PlayerState | List of players in the session |

### 3.2 PlayerState

Represents a player in a session.

| Field | Type | Description |
|-------|------|-------------|
| `playerId` | string (UUID) | Internal player identifier |
| `clientId` | string (UUID) | Client identifier (matches client's own `clientId`) |
| `displayName` | string | Display name (max 20 characters) |
| `connected` | boolean | Connection status |
| `lastSeenAt` | string (ISO 8601 date-time) | Last seen timestamp |
| `tr` | integer | Player's Terraform Rating (0–100) |
| `resources` | object (ResourcesMap) | Player's current resources |

### 3.3 ResourcesMap

A map of resource IDs to resource values.

```json
{
  "MC":      { "amount": 0, "production": 0 },
  "Steel":   { "amount": 0, "production": 0 },
  "Titanium": { "amount": 0, "production": 0 },
  "Plants":  { "amount": 0, "production": 0 },
  "Energy":  { "amount": 0, "production": 0 },
  "Heat":    { "amount": 0,  "production": 0 }
}
```

Valid resource IDs (case-sensitive): `MC`, `Steel`, `Titanium`, `Plants`, `Energy`, `Heat`.

The server MUST reject any resource ID not in this list.

### 3.4 GameState

The complete game state for a session.

| Field | Type | Description |
|-------|------|-------------|
| `version` | integer | Internal state version (starts at 1) |
| `resources` | array of Resource | Full resource definitions |
| `tr` | integer | Game-wide Terraform Rating (0–100) |

#### Resource

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Resource instance identifier |
| `name` | string | Human-readable name |
| `amount` | integer | Current amount |
| `production` | integer | Production amount |
| `isMegaCredit` | boolean | Is Mega Credit resource |
| `isEnergy` | boolean | Is Energy resource |
| `isHeat` | boolean | Is Heat resource |

### 3.5 Canonical Initial State

The canonical initial game state is:

```json
{
  "version": 1,
  "resources": [
    { "id": "00000000-0000-4000-8000-000000000001", "name": "MC",       "amount": 0, "production": 0, "isMegaCredit": true,  "isEnergy": false, "isHeat": false },
    { "id": "00000000-0000-4000-8000-000000000002", "name": "Steel",    "amount": 0, "production": 0, "isMegaCredit": false, "isEnergy": false, "isHeat": false },
    { "id": "00000000-0000-4000-8000-000000000003", "name": "Titanium", "amount": 0, "production": 0, "isMegaCredit": false, "isEnergy": false, "isHeat": false },
    { "id": "00000000-0000-4000-8000-000000000004", "name": "Plants",   "amount": 0, "production": 0, "isMegaCredit": false, "isEnergy": false, "isHeat": false },
    { "id": "00000000-0000-4000-8000-000000000005", "name": "Energy",   "amount": 0, "production": 0, "isMegaCredit": false, "isEnergy": true,  "isHeat": false },
    { "id": "00000000-0000-4000-8000-000000000006", "name": "Heat",     "amount": 0, "production": 0, "isMegaCredit": false, "isEnergy": false, "isHeat": true }
  ],
  "tr": 20
}
```

Notes:
- TR starts at 20
- Every resource amount starts at 0
- Every production value starts at 0

---

## 4. Client Messages

All client messages share these common fields:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Message type identifier (required) |
| `protocolVersion` | string | Protocol version (must be `"v1"`) |
| `requestId` | string (UUID) | Unique request identifier per message |

### 4.1 Create Session

Client requests creation of a new session.

```json
{
  "type": "createSession",
  "protocolVersion": "v1",
  "requestId": "uuid-here"
}
```

No optional fields. Server responds with `sessionCreated`.

### 4.2 Join Session

Client joins an existing session.

```json
{
  "type": "joinSession",
  "protocolVersion": "v1",
  "requestId": "uuid-here",
  "sessionId": "uuid-here",
  "joinCode": "A7B2C9",
  "clientId": "uuid-here",
  "displayName": "Player1"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string (UUID) | Session to join |
| `joinCode` | string | Join code for verification |
| `clientId` | string (UUID) | Client's own identifier |
| `displayName` | string | Player's display name (1–20 chars) |

### 4.3 Leave Session

Client leaves the session.

```json
{
  "type": "leaveSession",
  "protocolVersion": "v1",
  "requestId": "uuid-here",
  "sessionId": "uuid-here",
  "clientId": "uuid-here"
}
```

### 4.4 Resume Session

Client reconnects to an existing session.

```json
{
  "type": "resumeSession",
  "protocolVersion": "v1",
  "requestId": "uuid-here",
  "sessionId": "uuid-here",
  "clientId": "uuid-here"
}
```

Server responds with `stateSnapshot` containing the latest state.

### 4.5 Update Resource

Client updates a resource amount.

```json
{
  "type": "updateResource",
  "protocolVersion": "v1",
  "requestId": "uuid-here",
  "sessionId": "uuid-here",
  "clientId": "uuid-here",
  "actionId": "uuid-here",
  "expectedRevision": 5,
  "resourceId": "Steel",
  "amount": 10,
  "operation": "set"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string (UUID) | Session to modify |
| `clientId` | string (UUID) | Client's own identifier |
| `actionId` | string (UUID) | Unique action identifier |
| `expectedRevision` | integer | Expected server revision |
| `resourceId` | string | Resource ID (from valid list) |
| `amount` | integer | New amount value |
| `operation` | string | `"set"` or `"add"` |

### 4.6 Update Production

Client updates a resource production value.

```json
{
  "type": "updateProduction",
  "protocolVersion": "v1",
  "requestId": "uuid-here",
  "sessionId": "uuid-here",
  "clientId": "uuid-here",
  "actionId": "uuid-here",
  "expectedRevision": 5,
  "resourceId": "Steel",
  "production": 3
}
```

### 4.7 Update TR

Client updates their TR.

```json
{
  "type": "updateTR",
  "protocolVersion": "v1",
  "requestId": "uuid-here",
  "sessionId": "uuid-here",
  "clientId": "uuid-here",
  "actionId": "uuid-here",
  "expectedRevision": 5,
  "tr": 22
}
```

### 4.8 Run Production

Client triggers the production phase.

```json
{
  "type": "runProduction",
  "protocolVersion": "v1",
  "requestId": "uuid-here",
  "sessionId": "uuid-here",
  "clientId": "uuid-here",
  "actionId": "uuid-here",
  "expectedRevision": 5
}
```

### 4.9 Reset Player

Client resets their resources.

```json
{
  "type": "resetPlayer",
  "protocolVersion": "v1",
  "requestId": "uuid-here",
  "sessionId": "uuid-here",
  "clientId": "uuid-here",
  "actionId": "uuid-here",
  "expectedRevision": 5
}
```

### 4.10 Ping

Client pings the server for health check.

```json
{
  "type": "ping",
  "protocolVersion": "v1",
  "requestId": "uuid-here"
}
```

---

## 5. Server Messages

All server messages share these common fields:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Message type identifier |
| `protocolVersion` | string | Protocol version |
| `timestamp` | string (ISO 8601) | Server timestamp |

### 5.1 Session Created

```json
{
  "type": "sessionCreated",
  "protocolVersion": "v1",
  "timestamp": "2026-07-13T12:00:00.000Z",
  "sessionId": "uuid-here",
  "joinCode": "A7B2C9",
  "hostClientId": "uuid-here",
  "sessionState": <SessionState>
}
```

### 5.2 Session Joined

```json
{
  "type": "sessionJoined",
  "protocolVersion": "v1",
  "timestamp": "2026-07-13T12:00:01.000Z",
  "sessionId": "uuid-here",
  "playerId": "uuid-here",
  "playerIndex": 0
}
```

### 5.3 State Snapshot

```json
{
  "type": "stateSnapshot",
  "protocolVersion": "v1",
  "timestamp": "2026-07-13T12:00:02.000Z",
  "revision": 5,
  "sessionState": <SessionState>
}
```

### 5.4 Action Accepted

```json
{
  "type": "actionAccepted",
  "protocolVersion": "v1",
  "timestamp": "2026-07-13T12:00:03.000Z",
  "actionId": "uuid-here",
  "revision": 6,
  "sessionState": <SessionState>
}
```

### 5.5 Action Rejected

```json
{
  "type": "actionRejected",
  "protocolVersion": "v1",
  "timestamp": "2026-07-13T12:00:03.000Z",
  "actionId": "uuid-here",
  "errors": [
    { "code": "STALE_REVISION", "message": "Revision has changed" }
  ]
}
```

### 5.6 Player Joined

```json
{
  "type": "playerJoined",
  "protocolVersion": "v1",
  "timestamp": "2026-07-13T12:00:04.000Z",
  "playerId": "uuid-here",
  "displayName": "Player1",
  "playerCount": 2
}
```

### 5.7 Player Left

```json
{
  "type": "playerLeft",
  "protocolVersion": "v1",
  "timestamp": "2026-07-13T12:00:05.000Z",
  "playerId": "uuid-here",
  "displayName": "Player1",
  "playerCount": 1
}
```

### 5.8 Connection State

```json
{
  "type": "connectionState",
  "protocolVersion": "v1",
  "timestamp": "2026-07-13T12:00:00.000Z",
  "state": "connected",
  "message": null
}
```

Possible `state` values: `"connected"`, `"reconnecting"`, `"disconnected"`.

### 5.9 Pong

```json
{
  "type": "pong",
  "protocolVersion": "v1",
  "timestamp": "2026-07-13T12:00:00.000Z"
}
```

### 5.10 Error

```json
{
  "type": "error",
  "protocolVersion": "v1",
  "timestamp": "2026-07-13T12:00:00.000Z",
  "errors": [
    { "code": "INVALID_MESSAGE", "message": "Message validation failed" }
  ]
}
```

The `errors` field is an array. Each error has `code` (machine-readable) and `message` (human-readable).

---

## 6. Error Codes

| Code | HTTP-like | Client Message Context | Description |
|------|-----------|----------------------|-------------|
| `INVALID_MESSAGE` | 400 | Any | Message structure is invalid (schema violation) |
| `UNSUPPORTED_PROTOCOL_VERSION` | 426 | Any | `protocolVersion` is not `"v1"` |
| `SESSION_NOT_FOUND` | 404 | Any action | Session does not exist |
| `INVALID_JOIN_CODE` | 400 | `joinSession` | Join code is incorrect |
| `PLAYER_NOT_FOUND` | 404 | Any action | Client is not in the session |
| `DUPLICATE_ACTION` | 409 | Mutation actions | An existing `actionId` was reused with a different payload |
| `STALE_REVISION` | 409 | Mutation actions | `expectedRevision` is behind current revision |
| `INVALID_RESOURCE` | 400 | `updateResource`, `updateProduction` | Resource ID is not valid |
| `INVALID_AMOUNT` | 400 | `updateResource` | Amount is out of range (< 0 or too large) |
| `INVALID_PRODUCTION` | 400 | `updateProduction` | Production is out of range |
| `INVALID_TR` | 400 | `updateTR` | TR is out of range (< 0 or > 100) |
| `RATE_LIMITED` | 429 | Any | Client sent too many requests |
| `INTERNAL_ERROR` | 500 | Any | Server-side error |

Each error object has:

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Machine-readable error code |
| `message` | string | Human-readable description |

---

## 7. Revision Specification

### 7.1 Initial Revision

- Initial session revision is **0**
- Revision increases only on successful state mutations

### 7.2 Revision Increase Rules

Revision increases when:
1. A resource is added or subtracted (`updateResource`)
2. Production is updated (`updateProduction`)
3. TR is updated (`updateTR`)
4. Production phase is triggered (`runProduction`)
5. Player state is reset (`resetPlayer`)

Revision does NOT increase when:
1. `ping` is received (pong response)
2. `createSession` (session creation itself)
3. `joinSession` (joining only adds a player)
4. `leaveSession` (leaving only removes a player)
5. `resumeSession` (resuming only returns snapshot)
6. A rejected action (invalid, stale revision, etc.)

### 7.3 Expected Revision

- Client sends `expectedRevision` with each mutation action
- Server compares with its current revision
- If mismatch → `STALE_REVISION` error + latest `stateSnapshot`
- Client must retry with the correct `expectedRevision`

### 7.4 Undo / Redo

Future feature. When implemented:
- Undo/Redo operations will also increase revision
- Stale revision detection applies to all mutations

---

## 8. Action ID Specification

### 8.1 Format

- `actionId` is a **UUID string** (e.g., `"550e8400-e29b-41d4-a716-446655440000"`)
- Generated by the **client** for each mutation request

### 8.2 Deduplication

- Server MUST track all `actionId` values for the session
- If the same `actionId` and payload are received twice, return the cached
  `actionAccepted` result without applying the action again
- If an existing `actionId` is reused with a different payload, return
  `DUPLICATE_ACTION`

### 8.3 Retransmission

- Client may resend the same message with the same `actionId`
- This is the intended retransmission mechanism
- Server returns the same `actionAccepted` result

### 8.4 Retention

- Server retains `actionId` history for a **maximum of 1000 entries** per session
- When limit is exceeded, oldest entries are removed
- Alternatively, entries are removed after **5 minutes** of inactivity

### 8.5 Safety

- `actionId` is only used for **mutation** operations
- `createSession`, `joinSession`, `leaveSession`, `resumeSession`, `ping` do NOT need `actionId`
- `actionId` is included in `actionAccepted` and `actionRejected` responses

---

## 9. Message Exchange Flow

### 9.1 Create Session

```
Client (WebSocket)          Server
        |--- createSession -------->|
        |<-- sessionCreated -------|
        |<-- stateSnapshot -------| (session state for host)
```

### 9.2 Join Session

```
Client A (Host)    Server    Client B (Joiner)
        |                |               |
        |                |--- joinSession->|
        |                |<-- sessionJoined|
        |                |<-- stateSnapshot|
        |<-- playerJoined --|               |
        |                |               |
```

### 9.3 Mutation (Success)

```
Client            Server
    |--- updateResource ------->|
    |<-- actionAccepted --------|
    |<-- stateSnapshot ---------| (broadcast to all clients)
    |<-- playerJoined ---------| (if applicable)
```

### 9.4 Mutation (Stale Revision)

```
Client            Server
    |--- updateResource ------->|
    |<-- actionRejected --------|
    |<-- stateSnapshot ---------| (latest state)
    |--- updateResource (retry) ->|
    |<-- actionAccepted --------|
```

### 9.5 Leave Session

```
Client            Server
    |--- leaveSession -------->|
    |<-- playerLeft -----------|
```

---

## 10. Validation Rules

### 10.1 Message Level

1. `type` must be one of the defined message types
2. `protocolVersion` must be `"v1"` (or the version string defined here)
3. Message body must match the corresponding schema
4. Unknown `type` values are rejected with `INVALID_MESSAGE`

### 10.2 String Constraints

| Field | Constraint |
|-------|-----------|
| `protocolVersion` | Must match `"v1"` exactly |
| `joinCode` | 6 uppercase alphanumeric characters (A-Z, 0-9) |
| `displayName` | 1–20 printable characters |
| `sessionId` | RFC 4122 UUID format |
| `actionId` | RFC 4122 UUID format |
| `clientId` | RFC 4122 UUID format |
| `playerId` | RFC 4122 UUID format |

### 10.3 Numeric Constraints

| Field | Constraint |
|-------|-----------|
| `revision` | Non-negative integer (≥ 0) |
| `expectedRevision` | Non-negative integer (≥ 0) |
| `tr` | Integer 0–100 |
| `amount` | Integer ≥ 0 (no upper limit for now) |
| `production` | Integer -5–20; negative values are valid only for MC |

### 10.4 Array Constraints

| Field | Constraint |
|-------|-----------|
| `resources` (GameState) | Exactly 6 items (MC, Steel, Titanium, Plants, Energy, Heat) |
| `players` (SessionState) | 1–10 players |

---

## 11. Fixture Files

The following fixture files are provided for schema validation testing:

| File | Description |
|------|-------------|
| `protocol/fixtures/game-state.json` | Canonical initial game state |
| `protocol/fixtures/create-session.json` | Create session message |
| `protocol/fixtures/join-session.json` | Join session message |
| `protocol/fixtures/update-resource.json` | Update resource message |
| `protocol/fixtures/update-production.json` | Update production message |
| `protocol/fixtures/update-tr.json` | Update TR message |
| `protocol/fixtures/run-production.json` | Run production message |
| `protocol/fixtures/reset-player.json` | Reset player message |
| `protocol/fixtures/state-snapshot.json` | State snapshot from server |
| `protocol/fixtures/stale-revision-error.json` | Stale revision error |
| `protocol/fixtures/invalid-message.json` | Invalid message fixture |

---

## 12. JSON Schema Files

| File | Purpose |
|------|---------|
| `protocol/schemas/game-state.schema.json` | GameState schema |
| `protocol/schemas/session-state.schema.json` | SessionState + PlayerState schema |
| `protocol/schemas/client-message.schema.json` | All client message types |
| `protocol/schemas/server-message.schema.json` | All server message types |

All schemas use **JSON Schema Draft-07**.

---

## 13. Notes

- This protocol is designed to be implementable in both iOS (Swift Codable)
  and Web (TypeScript interfaces)
- No binary encoding, no custom serialization
- WebSocket frames contain exactly one JSON object
- The server is authoritative; clients send actions, not state
