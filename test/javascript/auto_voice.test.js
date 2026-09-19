import { test } from "node:test"
import assert from "node:assert/strict"

import { autoVoiceStorageKey, readAutoVoice, writeAutoVoice } from "../../app/javascript/lib/auto_voice.js"

function memoryStorage(start = {}) {
  const data = { ...start }
  return {
    getItem: key => Object.hasOwn(data, key) ? data[key] : null,
    setItem: (key, value) => { data[key] = String(value) },
    data
  }
}

test("storage key is per room", () => {
  assert.equal(autoVoiceStorageKey(1), "campfire.autoVoice.1")
  assert.equal(autoVoiceStorageKey(99), "campfire.autoVoice.99")
})

test("default is off", () => {
  assert.equal(readAutoVoice(1, memoryStorage()), false)
  assert.equal(readAutoVoice(null, memoryStorage()), false)
})

test("write on then read on", () => {
  const storage = memoryStorage()
  assert.equal(writeAutoVoice(7, true, storage), true)
  assert.equal(storage.data["campfire.autoVoice.7"], "on")
  assert.equal(readAutoVoice(7, storage), true)
})

test("write off persists as off", () => {
  const storage = memoryStorage({ "campfire.autoVoice.7": "on" })
  assert.equal(writeAutoVoice(7, false, storage), false)
  assert.equal(readAutoVoice(7, storage), false)
})

test("rooms do not share the flag", () => {
  const storage = memoryStorage()
  writeAutoVoice(1, true, storage)
  assert.equal(readAutoVoice(2, storage), false)
})


// PM16-F autoplay gate: a bot voice message autoplays only when the room's
// auto-voice is "on" in storage AND the user produced a gesture this page
// session. Restored storage alone (page load) must NOT autoplay — the
// autoplayUnlocked flag lives in module state, so these tests mint fresh
// module instances via a unique import query string to control it.

let freshTag = 0
const freshModule = () =>
  import(`../../app/javascript/lib/auto_voice.js?fresh=${++freshTag}`)

test("autoplay gate is not ready by default, even with storage on", async () => {
  const { autoplayReady } = await freshModule()
  const storage = memoryStorage({ "campfire.autoVoice.7": "on" })

  assert.equal(autoplayReady(7, storage), false)
})

test("autoplay gate is ready only after unlock + storage on", async () => {
  const { autoplayReady, unlockAutoplay } = await freshModule()
  const storage = memoryStorage({ "campfire.autoVoice.7": "on" })

  unlockAutoplay()

  assert.equal(autoplayReady(7, storage), true)
})

test("unlock alone is not enough without storage on", async () => {
  const { autoplayReady, unlockAutoplay } = await freshModule()
  const storage = memoryStorage({ "campfire.autoVoice.7": "off" })

  unlockAutoplay()

  assert.equal(autoplayReady(7, storage), false)
})

test("autoplay gate is room scoped", async () => {
  const { autoplayReady, unlockAutoplay } = await freshModule()
  const storage = memoryStorage()
  writeAutoVoice(1, true, storage)

  unlockAutoplay()

  assert.equal(autoplayReady(1, storage), true)
  assert.equal(autoplayReady(2, storage), false)
})

test("a second room is not unlocked by the first room's gesture + toggle", async () => {
  const { autoplayReady, unlockAutoplay } = await freshModule()
  // Room 1 was toggled on in a previous session; its storage survives.
  const storage = memoryStorage({ "campfire.autoVoice.1": "on" })

  unlockAutoplay() // room 1's toggle click, this session

  assert.equal(autoplayReady(1, storage), true)
  assert.equal(autoplayReady(2, storage), false)
})
