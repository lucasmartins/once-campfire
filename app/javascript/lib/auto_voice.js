// Per-room auto-voice preference (PM14-S1). Plugin wiring comes later;
// this module is storage only so Camofox/node can test without a bot key.

// PM16-F: autoplay gesture memory. Browsers only allow gestureless
// audio.play() after a real user activation in the page session; a toggle
// click qualifies. The flag deliberately does NOT persist — a page load
// that restores "on" from storage has no gesture, so nothing autoplays.
let autoplayUnlocked = false

export function unlockAutoplay() {
  autoplayUnlocked = true
}

export function autoplayReady(roomId, storage = globalThis.localStorage) {
  return readAutoVoice(roomId, storage) && autoplayUnlocked
}

export function autoVoiceStorageKey(roomId) {
  return `campfire.autoVoice.${roomId}`
}

export function readAutoVoice(roomId, storage = globalThis.localStorage) {
  if (roomId == null || roomId === "") return false
  try {
    return storage?.getItem(autoVoiceStorageKey(roomId)) === "on"
  } catch {
    return false
  }
}

export function writeAutoVoice(roomId, on, storage = globalThis.localStorage) {
  if (roomId == null || roomId === "") return false
  try {
    storage?.setItem(autoVoiceStorageKey(roomId), on ? "on" : "off")
    return !!on
  } catch {
    return false
  }
}
