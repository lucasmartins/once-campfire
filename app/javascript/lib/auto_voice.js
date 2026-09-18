// Per-room auto-voice preference (PM14-S1). Plugin wiring comes later;
// this module is storage only so Camofox/node can test without a bot key.

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
