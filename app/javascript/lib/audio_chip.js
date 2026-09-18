// Shared audio-chip markup contract (PM12-S1). One place defines the class
// names used by the composer's pending-file preview; the message-log partial
// app/views/messages/_audio_chip.html.erb mirrors the same contract.
// Deliberately free of framework and importmap dependencies (like
// lib/autocomplete/slash_command_search.js) so node --test can import it.

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }

function escapeHTML(string) {
  return String(string ?? "").replace(/[&<>\"']/g, character => HTML_ESCAPES[character])
}

// Any audio/* file: MediaRecorder blob, paperclip pick, drop, or paste.
export function isAudio(file) {
  return typeof file?.type == "string" && file.type.startsWith("audio/")
}

// Composer preview chip. The whole chip is the unpick button, matching the
// existing .composer__file preview where clicking removes the pending file:
// delete goes through composer#fileUnpicked with the index param.
// The .audio-chip__transcript slot ships empty in S1 — the PM12 plugin slice
// fills it after gateway STT. Do not render STT text here.
export function audioChipTemplate({ filename, index, deleteAction = "composer#fileUnpicked" }) {
  return `<button type="button" class="btn btn--plain audio-chip flex flex--align-center gap-half txt-small" data-action="${escapeHTML(deleteAction)}" data-composer-index-param="${escapeHTML(String(index))}">
  <span class="audio-chip__play flex-item-no-shrink" aria-hidden="true"></span>
  <span class="audio-chip__filename overflow-ellipsis">${escapeHTML(filename)}</span>
  <span class="audio-chip__transcript"></span>
</button>`
}
