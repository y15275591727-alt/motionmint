import assert from "node:assert/strict";
import test from "node:test";

import { visibleDownloadCount } from "../src/gallery.js";

test("gallery download counts expose only positive finite values", () => {
  const cases = [
    [0, null],
    ["0", null],
    [null, null],
    [undefined, null],
    [Number.NaN, null],
    [-3, null],
    [Number.POSITIVE_INFINITY, null],
    ["not-a-number", null],
    [3, 3],
    ["3", 3]
  ];

  for (const [input, expected] of cases) {
    assert.equal(visibleDownloadCount(input), expected);
  }
});
