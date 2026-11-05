import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { z } from "zod";
import type { readAudio } from "../shared/audio-marker";

type Output = z.input<typeof readAudio.output>;

/** A spoken summary is under 1 MB; this is a ceiling, not a target. */
const maxBytes = 12 * 1024 * 1024;

const mimeTypes: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".wav": "audio/wav",
};

/** Only audio files by extension, so the marker cannot be used to read anything else. */
export async function readSessionAudio(input: { path: string }): Promise<Output> {
  const file = path.resolve(input.path);
  const mimeType = mimeTypes[path.extname(file).toLowerCase()];
  if (!mimeType) return { ok: false, reason: "format" };
  try {
    const info = await stat(file);
    if (!info.isFile()) return { ok: false, reason: "missing" };
    if (info.size > maxBytes) return { ok: false, reason: "too-large" };
  } catch {
    return { ok: false, reason: "missing" };
  }
  try {
    return { ok: true, base64: (await readFile(file)).toString("base64"), mimeType };
  } catch {
    return { ok: false, reason: "unreadable" };
  }
}
