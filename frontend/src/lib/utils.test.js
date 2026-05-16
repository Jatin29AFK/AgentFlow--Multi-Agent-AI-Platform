import assert from "node:assert/strict";
import test from "node:test";

import { parseSseChunk } from "./utils.js";

test("parseSseChunk parses event names and JSON payloads", () => {
  const result = parseSseChunk(
    'event: node_completed\ndata: {"id":"evt-1","node":"reviewer"}\n\n'
  );

  assert.equal(result.event, "node_completed");
  assert.equal(result.data.id, "evt-1");
  assert.equal(result.data.node, "reviewer");
});

test("parseSseChunk adds a fallback id when the payload has none", () => {
  const result = parseSseChunk('event: done\ndata: {"run_id":"run-1"}\n\n');

  assert.equal(result.event, "done");
  assert.equal(result.data.run_id, "run-1");
  assert.ok(result.data.id);
});
