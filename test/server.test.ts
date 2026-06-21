import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { expect, test } from "vite-plus/test";

import { handleContent, handleSource } from "../src/server.ts";

test("source endpoint reads raw markdown", async () => {
  const filePath = await writeTempMarkdown("# Before");
  const res = createMockResponse();

  await handleSource(createMockRequest("GET"), res, filePath);

  expect(res.statusCode).toBe(200);
  expect(res.headers["Content-Type"]).toBe("text/markdown; charset=utf-8");
  expect(res.body).toBe("# Before");
});

test("source endpoint writes raw markdown", async () => {
  const filePath = await writeTempMarkdown("# Before");
  const res = createMockResponse();

  await handleSource(createMockRequest("PUT", "# After"), res, filePath);

  expect(res.statusCode).toBe(204);
  expect(await fs.readFile(filePath, "utf8")).toBe("# After");
});

test("source endpoint rejects writes from unexpected origin", async () => {
  const filePath = await writeTempMarkdown("# Before");
  const res = createMockResponse();

  await handleSource(
    createMockRequest("PUT", "# After", { origin: "http://example.com" }),
    res,
    filePath,
    "http://127.0.0.1:4321",
  );

  expect(res.statusCode).toBe(403);
  expect(await fs.readFile(filePath, "utf8")).toBe("# Before");
});

test("source endpoint allows writes from expected origin", async () => {
  const filePath = await writeTempMarkdown("# Before");
  const res = createMockResponse();

  await handleSource(
    createMockRequest("PUT", "# After", { origin: "http://127.0.0.1:4321" }),
    res,
    filePath,
    "http://127.0.0.1:4321",
  );

  expect(res.statusCode).toBe(204);
  expect(await fs.readFile(filePath, "utf8")).toBe("# After");
});

test("content endpoint returns rendered markdown and toc", async () => {
  const filePath = await writeTempMarkdown(`# Title

## Section`);
  const res = createMockResponse();

  await handleContent(res, filePath);

  expect(res.statusCode).toBe(200);
  expect(res.headers["Content-Type"]).toBe("application/json; charset=utf-8");
  expect(JSON.parse(res.body)).toMatchObject({
    toc: expect.stringContaining('<span class="toc-level">h1</span>Title'),
  });
  expect(JSON.parse(res.body).content).toContain('<h1 id="title">');
});

test("responses include basic security headers", async () => {
  const filePath = await writeTempMarkdown("# Title");
  const res = createMockResponse();

  await handleContent(res, filePath);

  expect(res.headers["Content-Security-Policy"]).toContain("default-src 'self'");
  expect(res.headers["Referrer-Policy"]).toBe("no-referrer");
  expect(res.headers["X-Content-Type-Options"]).toBe("nosniff");
});

async function writeTempMarkdown(markdown: string): Promise<string> {
  const directory = await fs.mkdtemp(path.join(tmpdir(), "md-live-"));
  const filePath = path.join(directory, "sample.md");
  await fs.writeFile(filePath, markdown, "utf8");
  return filePath;
}

function createMockRequest(
  method: string,
  body = "",
  headers: Record<string, string> = {},
): IncomingMessage {
  const req = Readable.from([body]) as Readable & {
    headers: Record<string, string>;
    method: string;
  };
  req.method = method;
  req.headers = headers;
  return req as unknown as IncomingMessage;
}

function createMockResponse(): ServerResponse & {
  body: string;
  headers: Record<string, string>;
  statusCode: number;
} {
  const res = new EventEmitter() as EventEmitter & {
    body: string;
    end: (chunk?: string) => void;
    headers: Record<string, string>;
    statusCode: number;
    writeHead: (statusCode: number, headers?: Record<string, string>) => void;
  };

  res.body = "";
  res.headers = {};
  res.statusCode = 200;
  res.writeHead = (statusCode, headers = {}) => {
    res.statusCode = statusCode;
    res.headers = headers;
  };
  res.end = (chunk = "") => {
    res.body += chunk;
  };

  return res as unknown as ServerResponse & {
    body: string;
    headers: Record<string, string>;
    statusCode: number;
  };
}
