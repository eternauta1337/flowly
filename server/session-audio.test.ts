import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { readSessionAudio } from "./session-audio";

test("reads an audio file as base64 with its type", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "flowly-audio-"));
  const file = path.join(dir, "r.mp3");
  await writeFile(file, Buffer.from([1, 2, 3]));
  expect(await readSessionAudio({ path: file })).toEqual({ ok: true, base64: "AQID", mimeType: "audio/mpeg" });
});

test("refuses anything that is not an audio file, and reports a missing one", async () => {
  expect(await readSessionAudio({ path: "/etc/passwd" })).toEqual({ ok: false, reason: "format" });
  expect(await readSessionAudio({ path: "/nonexistent/r.mp3" })).toEqual({ ok: false, reason: "missing" });
});
