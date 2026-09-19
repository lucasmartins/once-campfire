import { Controller } from "@hotwired/stimulus"

// Shared audio chip controller (PM12-S1 → PM16-B/C). Drives BOTH chips:
// the message-log chip (src from data-audio-chip-src-value, same-origin blob
// path) and the composer's pending-recording chip (src is a local object URL
// built by composer_controller). toggle() plays/pauses; clicking the waveform
// canvas seeks. The spectrogram is computed fully client-side with
// AudioContext.decodeAudioData over the same audio the element plays — no
// extra server round-trip, no upload for analysis. Every failure (no
// AudioContext, fetch error, decode error) degrades to a silent no-op: the
// chip still plays, it just has no bars.

const WAVE_WIDTH = 120
const WAVE_HEIGHT = 28
const WAVE_BARS = 40
const WAVE_BAR_WIDTH = 2
const WAVE_BAR_GAP = 1

// Best-effort single-player registry: starting one chip pauses the others.
let playingChip = null

export default class extends Controller {
  static targets = [ "duration", "wave" ]
  static values = { src: String }

  connect() {
    this.audio = new Audio(this.srcValue)
    this.audio.preload = "metadata"

    this.audio.addEventListener("loadedmetadata", () => {
      if (this.hasDurationTarget && isFinite(this.audio.duration)) {
        this.durationTarget.textContent = formatDuration(this.audio.duration)
      }
    })

    this.audio.addEventListener("ended", () => this.#setPaused(true))
    this.audio.addEventListener("play", () => {
      if (playingChip && playingChip !== this) {
        try { playingChip.audio?.pause() } catch { /* already torn down */ }
      }
      playingChip = this
      this.#setPaused(false)
    })
    this.audio.addEventListener("pause", () => {
      if (playingChip === this) playingChip = null
      this.#setPaused(true)
    })

    this.#drawWaveform()
  }

  disconnect() {
    if (playingChip === this) playingChip = null
    this.audio?.pause()
    this.audio = null
  }

  toggle() {
    this.audio.paused ? this.audio.play() : this.audio.pause()
  }

  // Click on the waveform canvas seeks by the x fraction of its width.
  seek(event) {
    if (!this.audio || !isFinite(this.audio.duration) || !this.hasWaveTarget) return

    const bounds = this.waveTarget.getBoundingClientRect()
    if (!bounds.width) return

    const fraction = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
    this.audio.currentTime = fraction * this.audio.duration
  }

  async #drawWaveform() {
    try {
      if (typeof AudioContext == "undefined" || !this.srcValue) return

      const response = await fetch(this.srcValue)
      const bytes = await response.arrayBuffer()

      const audioContext = new AudioContext()
      const decoded = await audioContext.decodeAudioData(bytes)
      audioContext.close?.()

      this.#renderPeaks(peaksFrom(decoded, WAVE_BARS))
    } catch {
      // Graceful no-op: undecodable audio (or no AudioContext) leaves the
      // canvas empty — play/pause still works.
    }
  }

  #renderPeaks(peaks) {
    const canvas = this.hasWaveTarget ? this.waveTarget : null
    if (!canvas?.getContext) return

    const scale = (typeof window != "undefined" && window.devicePixelRatio > 1) ? 2 : 1
    const width = WAVE_WIDTH * scale
    const height = WAVE_HEIGHT * scale

    canvas.width = width
    canvas.height = height

    const context = canvas.getContext("2d")
    context.clearRect(0, 0, width, height)
    context.fillStyle = getComputedStyle(canvas).color

    const barWidth = WAVE_BAR_WIDTH * scale
    const stride = (WAVE_BAR_WIDTH + WAVE_BAR_GAP) * scale
    const minimumBarHeight = Math.max(2, Math.round(height * 0.12))

    peaks.forEach((peak, index) => {
      const barHeight = Math.max(minimumBarHeight, Math.round(peak * height))
      const x = index * stride
      const y = Math.round((height - barHeight) / 2)
      context.fillRect(x, y, barWidth, barHeight)
    })
  }

  #setPaused(paused) {
    this.element.classList.toggle("audio-chip--playing", !paused)
  }
}

// Normalized 0..1 peak per bar, mixed down across channels. A silent clip
// returns all-zero peaks — #renderPeaks still draws the minimum-height flat
// line so the waveform never disappears.
function peaksFrom(buffer, barCount) {
  const channels = []
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    channels.push(buffer.getChannelData(channel))
  }

  const length = buffer.length
  const bucketSize = Math.max(1, Math.floor(length / barCount))
  const peaks = []
  let loudest = 0

  for (let bar = 0; bar < barCount; bar++) {
    const start = bar * bucketSize
    const end = Math.min(length, start + bucketSize)
    let peak = 0

    for (let sample = start; sample < end; sample++) {
      for (const data of channels) {
        const amplitude = Math.abs(data[sample])
        if (amplitude > peak) peak = amplitude
      }
    }

    peaks.push(peak)
    if (peak > loudest) loudest = peak
  }

  return loudest > 0 ? peaks.map(peak => peak / loudest) : peaks
}

function formatDuration(seconds) {
  const whole = Math.round(seconds)
  const minutes = Math.floor(whole / 60)
  const rest = String(whole % 60).padStart(2, "0")
  return `${minutes}:${rest}`
}
