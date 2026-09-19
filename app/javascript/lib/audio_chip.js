// Shared audio-chip markup contract (PM12-S1 → PM16-B). One place defines the
// class names used by the composer's pending-audio preview; the message-log
// partial app/views/messages/_audio_chip.html.erb mirrors the same contract.
// Deliberately free of framework and importmap dependencies (like
// lib/autocomplete/slash_command_search.js) so node --test can import it.

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }

function escapeHTML(string) {
  return String(string ?? "").replace(/[&<>"']/g, character => HTML_ESCAPES[character])
}

// Any audio/* file: MediaRecorder blob, paperclip pick, drop, or paste.
export function isAudio(file) {
  return typeof file?.type == "string" && file.type.startsWith("audio/")
}

// Composer preview chip (PM16-B): a play button (its own audio-chip controller
// instance plays the local object URL), a client-side spectrogram canvas, a
// duration label, and an X delete button. The chip itself is NOT a button —
// only the X triggers composer#fileUnpicked, with the index param. No
// filename element. The .audio-chip__transcript slot ships empty — the PM12
// plugin slice fills it after gateway STT.
export function audioChipTemplate({ index, src, deleteAction = "composer#fileUnpicked" }) {
  const srcAttribute = src ? ` data-audio-chip-src-value="${escapeHTML(src)}"` : ""

  return `<div class="audio-chip flex flex--align-center gap-half txt-small"${srcAttribute} data-controller="audio-chip">
  <button type="button" class="btn btn--plain audio-chip__play flex-item-no-shrink" data-action="audio-chip#toggle" aria-label="Play audio"></button>
  <canvas class="audio-chip__wave flex-item-no-shrink" data-audio-chip-target="wave" data-action="click->audio-chip#seek" role="img" aria-label="Waveform, click to seek"></canvas>
  <span class="audio-chip__duration flex-item-no-shrink" data-audio-chip-target="duration"></span>
  <button type="button" class="btn btn--plain audio-chip__remove flex-item-no-shrink" data-action="${escapeHTML(deleteAction)}" data-composer-index-param="${escapeHTML(String(index))}" aria-label="Remove audio"></button>
  <span class="audio-chip__transcript"></span>
</div>`
}
