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
      this.element.classList.add("btn--success")
    } catch {
      this.element.removeAttribute("disabled")
    }
  }
}
