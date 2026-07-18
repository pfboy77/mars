import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const schemasDirectory = join(import.meta.dirname, "schemas");
const fixturesDirectory = join(import.meta.dirname, "fixtures");

function loadJSON(directory, filename) {
  return JSON.parse(readFileSync(join(directory, filename), "utf8"));
}

const schemas = {
  game: loadJSON(schemasDirectory, "game-state.schema.json"),
  session: loadJSON(schemasDirectory, "session-state.schema.json"),
  client: loadJSON(schemasDirectory, "client-message.schema.json"),
  server: loadJSON(schemasDirectory, "server-message.schema.json"),
};

// The schemas use allOf composition where the object type is declared in a
// sibling subschema. Draft-07 permits this, so only strictTypes is relaxed.
const ajv = new Ajv({ allErrors: true, strict: true, strictTypes: false });
addFormats(ajv);
Object.values(schemas).forEach(schema => ajv.addSchema(schema));

const validators = {
  game: ajv.getSchema("game-state.schema.json"),
  session: ajv.getSchema("session-state.schema.json"),
  client: ajv.getSchema("client-message.schema.json"),
  server: ajv.getSchema("server-message.schema.json"),
};

let passed = 0;
let failed = 0;

function check(condition, description, errors = null) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${description}`);
    return;
  }

  failed += 1;
  console.error(`  ✗ ${description}`);
  if (errors) {
    console.error(ajv.errorsText(errors, { separator: "\n    " }));
  }
}

function validateFixture(filename, validator) {
  const data = loadJSON(fixturesDirectory, filename);
  const valid = validator(data);
  check(valid, `${filename} passes its schema`, validator.errors);
  return data;
}

console.log("=== Red Planet Companion — JSON Schema validation ===");

const gameState = validateFixture("game-state.json", validators.game);
const createSession = validateFixture("create-session.json", validators.client);
validateFixture("join-session.json", validators.client);
validateFixture("update-resource.json", validators.client);
validateFixture("update-production.json", validators.client);
validateFixture("update-tr.json", validators.client);
validateFixture("run-production.json", validators.client);
validateFixture("reset-player.json", validators.client);
const stateSnapshot = validateFixture("state-snapshot.json", validators.server);
validateFixture("stale-revision-error.json", validators.server);
validateFixture("invalid-message.json", validators.server);

check(validators.session(stateSnapshot.sessionState),
      "state-snapshot sessionState passes the session schema",
      validators.session.errors);
check(gameState.resources.every(resource => resource.amount === 0 && resource.production === 0),
      "canonical game state starts with zero amounts and production");
check(gameState.tr === 20, "canonical game state starts with TR 20");

const invalidCases = [
  {
    description: "missing type is rejected",
    validator: validators.client,
    data: { protocolVersion: "v1", requestId: createSession.requestId },
  },
  {
    description: "unknown message type is rejected",
    validator: validators.client,
    data: { ...createSession, type: "unknownType" },
  },
  {
    description: "invalid request UUID is rejected",
    validator: validators.client,
    data: { ...createSession, requestId: "not-a-uuid" },
  },
  {
    description: "unsupported protocol version is rejected",
    validator: validators.client,
    data: { ...createSession, protocolVersion: "v2" },
  },
  {
    description: "invalid timestamp format is rejected",
    validator: validators.server,
    data: {
      type: "pong",
      protocolVersion: "v1",
      timestamp: "not-a-date",
    },
  },
  {
    description: "snapshot without sessionState is rejected",
    validator: validators.server,
    data: {
      type: "stateSnapshot",
      protocolVersion: "v1",
      timestamp: "2026-07-13T12:00:05.000Z",
      revision: 5,
    },
  },
];

for (const testCase of invalidCases) {
  const valid = testCase.validator(testCase.data);
  check(!valid, testCase.description);
}

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log("All schema validation tests passed.");
}
