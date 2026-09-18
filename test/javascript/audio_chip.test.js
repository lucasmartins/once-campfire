import { test } from "node:test"
import assert from "node:assert/strict"

import { isAudio, audioChipTemplate } from "../../app/javascript/lib/audio_chip.js"

test("isAudio matches any audio/* file", () => {
  assert.equal(isAudio({ name: "voice-message.webm", type: "audio/webm" }), true)
  assert.equal(isAudio({ name: "clip.mp3", type: "audio/mpeg" }), true)
  assert.equal(isAudio(new File([], "clip.ogg", { type: "audio/ogg" })), true)
})

test("isAudio rejects non-audio files and missing type", () => {
  assert.equal(isAudio({ name: "moon.jpg", type: "image/jpeg" }), false)
  assert.equal(isAudio({ name: "notes.txt", type: "text/plain" }), false)
  assert.equal(isAudio({ name: "mystery" }), false)
  assert.equal(isAudio(null), false)
  assert.equal(isAudio(undefined), false)
})

test("isAudio does not confuse image/audiobook style prefixes", () => {
  assert.equal(isAudio({ type: "audiofile/thing" }), false)
  assert.equal(isAudio({ type: "audio" }), false)
})

test("audioChipTemplate renders the shared chip markup contract", () => {
  const chip = audioChipTemplate({ filename: "voice-message.webm", index: 0 })

  assert.match(chip, /class="btn btn--plain audio-chip /)
  assert.match(chip, /audio-chip__play/)
  assert.match(chip, /audio-chip__filename[^>]*>voice-message\.webm</)
  assert.match(chip, /audio-chip__transcript"><\/span>/)
})

test("audioChipTemplate wires delete through composer#fileUnpicked with the index", () => {
  const chip = audioChipTemplate({ filename: "clip.ogg", index: 2 })

  assert.match(chip, /data-action="composer#fileUnpicked"/)
  assert.match(chip, /data-composer-index-param="2"/)
})

test("audioChipTemplate escapes the filename", () => {
  const chip = audioChipTemplate({ filename: '<script>alert("x")</script>.mp3', index: 0 })

  assert.doesNotMatch(chip, /<script>/)
  assert.match(chip, /audio-chip__filename[^>]*>&lt;script&gt;/)
})

test("audioChipTemplate transcript slot ships empty in S1", () => {
  const chip = audioChipTemplate({ filename: "clip.mp3", index: 0 })

  // Empty element, no inner text — gateway STT text is out of scope for S1.
  assert.doesNotMatch(chip, /audio-chip__transcript">[^<]+</)
})
