import { Controller } from "@hotwired/stimulus"
import { cable } from "@hotwired/turbo-rails"
import { throttle } from "helpers/timing_helpers"
import { pageIsTurboPreview } from "helpers/turbo_helpers"
import TypingTracker from "models/typing_tracker"

export default class extends Controller {
  static targets = [ "author", "indicator" ]
  static classes = [ "active" ]

  async connect() {
    if (!pageIsTurboPreview()) {
      this.tracker = new TypingTracker(this.#update.bind(this))

      this.channel = await cable.subscribeTo(
        { channel: "TypingNotificationsChannel", room_id: Current.room.id },
        { received: this.#received.bind(this) }
      )
    }
  }

  disconnect() {
    this.tracker?.close()
    this.channel?.unsubscribe()
  }

  start({ target }) {
    if (target.value) {
      this.#throttledSend("start")
    } else {
      this.#send("stop")
    }
  }

  stop() {
    this.#send("stop");
  }

  // Only "stop" clears a name: an unknown action must never remove someone
  // who is still typing. "thinking" marks the entry as bot thinking so the
  // indicator text differs from plain human typing; "start" stays unchanged.
  #received({ action, user }) {
    if (user.id !== Current.user.id) {
      if (action === "start" || action === "thinking") {
        this.tracker.add(user.name, action === "thinking")
      } else if (action === "stop") {
        this.tracker.remove(user.name)
      }
    }
  }

  #send(action) {
    this.channel.send({ action })
  }

  #update(message) {
    this.authorTarget.textContent = message
    this.indicatorTarget.classList.toggle(this.activeClass, !!message)
  }

  #throttledSend = throttle(action => this.#send(action))
}
