import { test } from "node:test";
import assert from "node:assert/strict";
import {
  requestControl,
  controlState,
  type ControlPort,
  type ControlRequest,
} from "../src/controlProtocol.ts";
function host() {
  const listeners = new Set<(value: unknown) => void>(),
    requests: ControlRequest[] = [];
  const port: ControlPort = {
    subscribe: (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    send: async (data) => {
      requests.push(data as ControlRequest);
    },
  };
  const reply = (index: number, ok = true) => {
    for (const listener of listeners)
      listener({
        kind: "reply",
        requestId: requests[index].requestId,
        ok,
        state: { active: true, count: index + 1 },
        error: "Only the GM can change hotspots.",
      });
  };
  return { port, listeners, requests, reply };
}
test("start waits for a matching background acknowledgment and cleans up", async () => {
  const h = host(),
    promise = requestControl(
      h.port,
      "start",
      { scene: "a", cellSize: 100, cells: [] },
      500,
    );
  assert.equal(h.requests[0].command, "start");
  assert.equal(h.listeners.size, 1);
  h.reply(0);
  assert.deepEqual(await promise, { active: true, count: 1 });
  assert.equal(h.listeners.size, 0);
});
test("simultaneous commands accept only their own replies, even out of order", async () => {
  const h = host(),
    first = requestControl(h.port, "status", undefined, 500),
    second = requestControl(h.port, "finish", undefined, 500);
  h.reply(1);
  assert.equal((await second).count, 2);
  assert.equal(h.listeners.size, 1);
  h.reply(0);
  assert.equal((await first).count, 1);
  assert.equal(h.listeners.size, 0);
});
test("background validation errors reach the panel without a success state", async () => {
  const h = host(),
    promise = requestControl(h.port, "start", undefined, 500);
  h.reply(0, false);
  await assert.rejects(promise, /Only the GM/);
  assert.equal(h.listeners.size, 0);
});
test("missing background fails once with a timeout and releases its listener", async () => {
  const h = host();
  await assert.rejects(
    requestControl(h.port, "start", undefined, 15),
    /background did not respond/,
  );
  assert.equal(h.requests.length, 1);
  assert.equal(h.listeners.size, 0);
});
test("transport failure cleans up without retrying or producing a false acknowledgment", async () => {
  const h = host();
  let calls = 0;
  h.port.send = async () => {
    calls++;
    throw new Error("Disconnected");
  };
  await assert.rejects(
    requestControl(h.port, "start", undefined, 500),
    /Disconnected/,
  );
  assert.equal(calls, 1);
  assert.equal(h.listeners.size, 0);
});
test("malformed replies fail clearly and unrelated state broadcasts are ignored", async () => {
  const h = host(),
    promise = requestControl(h.port, "status", undefined, 500);
  for (const listener of h.listeners)
    listener({ kind: "state", state: { active: true, count: 3 } });
  assert.equal(h.listeners.size, 1);
  for (const listener of h.listeners)
    listener({
      kind: "reply",
      requestId: h.requests[0].requestId,
      ok: true,
      state: { active: true, count: 9999 },
    });
  await assert.rejects(promise, /Invalid response/);
  assert.equal(h.listeners.size, 0);
  assert.equal(controlState({ active: "yes", count: 2 }), undefined);
});
