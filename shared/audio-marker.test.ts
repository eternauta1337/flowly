import { expect, test } from "vitest";
import { splitAudioMarker } from "./audio-marker";

test("a reply without a marker is unchanged", () => {
  expect(splitAudioMarker("Hola")).toEqual({ text: "Hola", audio: null });
});

test("the marker leaves the text and becomes the audio, with or without a label", () => {
  expect(splitAudioMarker("Resumen listo.\n\n[[audio:/tmp/a/r.mp3|Escuchar el resumen]]")).toEqual({
    text: "Resumen listo.",
    audio: { path: "/tmp/a/r.mp3", label: "Escuchar el resumen" },
  });
  expect(splitAudioMarker("[[audio: /tmp/a/r.mp3 ]]")).toEqual({ text: "", audio: { path: "/tmp/a/r.mp3" } });
});
