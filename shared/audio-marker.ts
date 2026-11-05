import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

// An agent reply can carry an audio marker for a "Listen" button: [[audio:/path.mp3]] or
// [[audio:/path.mp3|Label]] (the archibald-audio convention). Paseo's own timeline turns it into a
// button through that plugin's transformer, but the side chat reads the raw text (upstream issue #77),
// so Flowly recognizes the marker itself and reads the file through its own server.

// Only an absolute path, outside backticks: an agent explaining the marker (`[[audio:…]]`) must not get a
// button that fails because "…" is not an audio file.
const marker = /(?<!`)\[\[audio:\s*(\/[^\]|]+?)(?:\|([^\]]*))?\]\](?!`)/;

export interface AudioMarker {
  path: string;
  label?: string;
}

/** The reply text without its marker, and the marker's audio when there is one. */
export function splitAudioMarker(text: string): { text: string; audio: AudioMarker | null } {
  const found = marker.exec(text);
  if (!found) return { text, audio: null };
  const [whole, path, label] = found;
  return {
    text: text.replace(whole, "").trim(),
    audio: { path: path.trim(), ...(label?.trim() ? { label: label.trim() } : {}) },
  };
}

export const readAudio = defineRpc({
  name: "session.audio",
  input: z.strictObject({ path: z.string().min(1).max(4096) }),
  output: z.discriminatedUnion("ok", [
    z.strictObject({ ok: z.literal(true), base64: z.string(), mimeType: z.string() }),
    z.strictObject({ ok: z.literal(false), reason: z.enum(["missing", "too-large", "format", "unreadable"]) }),
  ]),
});
