// Regression coverage replacing the retired 1.x control protocol tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Item } from "@owlbear-rodeo/sdk";
import { NS, data } from "../src/model.ts";
test("unknown link schemas and malformed player access are ignored", () => {
  const item = {
    type: "IMAGE",
    metadata: {
      [NS]: {
        version: 99,
        title: "Clue",
        url: "https://example.com/clue.png",
        enabled: true,
        players: true,
      },
    },
  } as unknown as Item;
  assert.equal(data(item), undefined);
  item.metadata[NS] = {
    version: 3,
    title: "Clue",
    url: "https://example.com/clue.png",
    enabled: true,
    players: "true",
  };
  assert.equal(data(item), undefined);
});
