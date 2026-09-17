import { Controller } from "@hotwired/stimulus"

// POSTs a message button click to the owning bot's callback as the signed-in
// human (session cookie + CSRF meta tag). The browser never holds a bot_key.
export default class extends Controller {
  static values = { url: String }

  async click() {
    this.element.setAttribute("disabled", "disabled")

    try {
      const token = document.querySelector("meta[name=csrf-token]")?.content
      const response = await fetch(this.urlValue, {
        method: "POST",
        headers: {
          "X-CSRF-Token": token,
          "Accept": "application/json"
        }
      })
      if (!response.ok) throw new Error("click failed")
      this.select(this.element)
      this.disableRow()
    } catch {
      this.element.removeAttribute("disabled")
    }
  }

  // Mark the clicked button persistently selected: the ring stays after the
  // btn--success flash animation (1s) is gone, and matches the server-rendered
  // is-selected state for buttons the user already clicked.
  select(button) {
    button.classList.add("btn--success", "is-selected")
    button.setAttribute("aria-pressed", "true")
    button.setAttribute("disabled", "disabled")
  }

  // One answer per message: a successful click disables every sibling button.
  disableRow() {
    const row = this.element.closest("[id$=_buttons], .message__buttons")

    for (const button of row?.querySelectorAll("button[data-controller=button-click]") ?? []) {
      button.setAttribute("disabled", "disabled")
    }
  }
}
