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

test("audioChipTemplate renders play + waveform canvas + duration, no filename (PM16-B)", () => {
  const chip = audioChipTemplate({ index: 0, src: "blob:http://localhost/1" })

  // The chip is a container div hosting its own audio-chip controller, not a
  // whole-chip delete button.
  assert.match(chip, /^<div class="audio-chip /)
  assert.match(chip, /data-controller="audio-chip"/)
  assert.match(chip, /data-audio-chip-src-value="blob:http:\/\/localhost\/1"/)

  assert.match(chip, /audio-chip__play/)
  assert.match(chip, /<canvas class="audio-chip__wave[^"]*"[^>]*data-audio-chip-target="wave"/)
  assert.match(chip, /audio-chip__duration[^>]*data-audio-chip-target="duration"/)

  // NO filename element anywhere in the chip.
  assert.doesNotMatch(chip, /audio-chip__filename/)
})

test("only the X remove button deletes, via composer#fileUnpicked with the index param", () => {
  const chip = audioChipTemplate({ index: 2 })

  assert.equal((chip.match(/data-action="composer#fileUnpicked"/g) || []).length, 1)
  assert.match(chip, /audio-chip__remove[^>]*data-action="composer#fileUnpicked"/)
  assert.match(chip, /data-composer-index-param="2"/)

  // Neither the chip root nor the play button is a delete trigger.
  assert.doesNotMatch(chip, /^<button/)
  assert.doesNotMatch(chip, /audio-chip__play[^>]*data-action="composer#fileUnpicked"/)
})

test("play button toggles the chip's own audio-chip controller instance", () => {
  const chip = audioChipTemplate({ index: 0, src: "blob:http://localhost/1" })

  assert.match(chip, /audio-chip__play[^>]*data-action="audio-chip#toggle"/)
  assert.match(chip, /data-audio-chip-target="wave"/)
  assert.match(chip, /data-audio-chip-target="duration"/)
})

test("audioChipTemplate escapes the src URL", () => {
  const chip = audioChipTemplate({ index: 0, src: '"><script>alert("x")</script>' })

  assert.doesNotMatch(chip, /<script>/)
  assert.match(chip, /data-audio-chip-src-value="&quot;&gt;/)
})

test("src attribute is optional — the log partial supplies its own src", () => {
  const chip = audioChipTemplate({ index: 0 })

  assert.doesNotMatch(chip, /data-audio-chip-src-value/)
})
