import { useRpc } from "@getpaseo/plugin/client";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Button, Label, font, space } from "./ui";
import { readAudio, type AudioMarker } from "../shared/audio-marker";
import { t } from "../shared/i18n";

// The "Listen" button of an agent reply in the side chat (shared/audio-marker.ts). Nothing plays until it
// is pressed. Where the client has an <audio> element (desktop, web) it toggles play and pause; elsewhere it
// falls back to the host's playAudio, which plays the file through once.

type Source = { base64: string; mimeType: string };
type HostPlay = (source: Source) => Promise<void>;
type Element = { play(): Promise<void>; pause(): void; paused: boolean; addEventListener(type: string, fn: () => void): void };

let hostPlay: HostPlay | null = null;
/** Set once from contribute(): the host's player is only on the client context, not in component props. */
export function setHostAudioPlayer(play: HostPlay) {
  hostPlay = play;
}

const AudioElement = (globalThis as { Audio?: new (src: string) => Element }).Audio;
/** One element per file, outside the component, so scrolling the list away does not stop it; one plays at a time. */
const elements = new Map<string, Element>();
let current: Element | null = null;

function failure(reason: string): string {
  if (reason === "missing") return t("The audio file is gone.");
  if (reason === "too-large") return t("The audio file is too large.");
  if (reason === "format") return t("That audio format is not supported.");
  return t("The audio file could not be read.");
}

export function SessionAudio({ audio }: { audio: AudioMarker }) {
  const read = useRpc(readAudio);
  const [state, setState] = useState<"idle" | "loading" | "playing">(() => (elements.get(audio.path)?.paused === false ? "playing" : "idle"));
  const [error, setError] = useState("");
  useEffect(() => {
    const element = elements.get(audio.path);
    if (!element) return;
    const sync = () => setState(element.paused ? "idle" : "playing");
    element.addEventListener("play", sync);
    element.addEventListener("pause", sync);
    element.addEventListener("ended", sync);
  }, [audio.path, state]);

  const press = async () => {
    setError("");
    const loaded = elements.get(audio.path);
    if (loaded) {
      if (!loaded.paused) return loaded.pause();
      if (current && current !== loaded) current.pause();
      current = loaded;
      return void loaded.play().catch((e: unknown) => setError(String(e)));
    }
    setState("loading");
    try {
      const result = await read({ path: audio.path });
      if (!result.ok) {
        setState("idle");
        return setError(failure(result.reason));
      }
      if (AudioElement) {
        const element = new AudioElement(`data:${result.mimeType};base64,${result.base64}`);
        elements.set(audio.path, element);
        if (current) current.pause();
        current = element;
        element.addEventListener("ended", () => setState("idle"));
        await element.play();
        setState("playing");
      } else if (hostPlay) {
        setState("playing");
        await hostPlay(result);
        setState("idle");
      } else {
        setState("idle");
        setError(t("This client cannot play audio."));
      }
    } catch (e) {
      setState("idle");
      setError(String(e instanceof Error ? e.message : e));
    }
  };

  return (
    <View style={{ alignItems: "flex-start", gap: space[1] }}>
      <Button small icon={state === "playing" ? "Pause" : "Play"} disabled={state === "loading"} onPress={() => void press()}>
        {state === "loading" ? t("Loading…") : audio.label || t("Listen")}
      </Button>
      {!!error && <Label muted size={font.sm}>{error}</Label>}
    </View>
  );
}
