import { Controller } from "@hotwired/stimulus"

// Play/pause for the shared audio chip in the message log (PM12-S1). The
// composer preview chip is a plain unpick button and never instantiates this.
export default class extends Controller {
  static targets = [ "duration" ]
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
    this.audio.addEventListener("play", () => this.#setPaused(false))
    this.audio.addEventListener("pause", () => this.#setPaused(true))
  }

  disconnect() {
    this.audio?.pause()
    this.audio = null
  }

  toggle() {
    this.audio.paused ? this.audio.play() : this.audio.pause()
  }

  #setPaused(paused) {
    this.element.classList.toggle("audio-chip--playing", !paused)
  }
}

function formatDuration(seconds) {
  const whole = Math.round(seconds)
  const minutes = Math.floor(whole / 60)
  const rest = String(whole % 60).padStart(2, "0")
  return `${minutes}:${rest}`
}
