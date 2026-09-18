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
