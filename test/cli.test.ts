import { expect, test } from "vite-plus/test";

import { parseStartOptions, usage } from "../src/cli.ts";

test("uses md-live in usage text", () => {
  expect(usage[0]).toBe("Usage: md-live <file.md> [--port 4321] [--host 127.0.0.1]");
});

test("parses default start options", () => {
  expect(parseStartOptions(["sample.md"])).toEqual({
    kind: "start",
    options: {
      filePath: "sample.md",
      host: "127.0.0.1",
      port: 4321,
    },
  });
});

test("ignores standalone pnpm argument separator", () => {
  expect(parseStartOptions(["--", "sample.md"])).toEqual({
    kind: "start",
    options: {
      filePath: "sample.md",
      host: "127.0.0.1",
      port: 4321,
    },
  });
});

test("parses host and port options", () => {
  expect(parseStartOptions(["sample.md", "--host", "localhost", "--port", "4322"])).toEqual({
    kind: "start",
    options: {
      filePath: "sample.md",
      host: "localhost",
      port: 4322,
    },
  });
});

test("rejects invalid port", () => {
  expect(parseStartOptions(["sample.md", "--port", "abc"])).toEqual({
    kind: "error",
    message: "Invalid --port value.",
  });
});
