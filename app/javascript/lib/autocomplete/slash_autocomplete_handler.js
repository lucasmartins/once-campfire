import BaseAutocompleteHandler from "lib/autocomplete/base_autocomplete_handler"

// Static command stubs. The Hermes plugin replaces this list with its own
// registry later; the handler only filters and inserts whatever is set here.
export const SLASH_COMMANDS = [
  { name: "help", description: "Show available slash commands" },
  { name: "status", description: "Show session status" },
  { name: "new", description: "Start a new session" },
  { name: "compact", description: "Compact the session context" },
  { name: "model", description: "Show or switch the active model" },
  { name: "approve", description: "Approve the pending action" },
  { name: "deny", description: "Deny the pending action" }
]

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
  ))
}

function autocompletableForCommand({ name, description }) {
  return { value: name, name, description }
}

function renderCommandOption(autocompletable) {
  const name = escapeHtml(autocompletable.name)
  const description = escapeHtml(autocompletable.description)

  return `
    <suggestion-option class="autocomplete__item flex align-center gap unpad" role="option" value="${name}">
      <button class="autocomplete__btn btn btn--borderless btn--transparent min-width flex-item-grow justify-start" data-value="${name}">
        <span class="autocompletable__name">
          <strong>/${name}</strong>
          <span class="txt-small txt-subtle"> — ${description}</span>
        </span>
      </button>
    </suggestion-option>
  `
}

export default class extends BaseAutocompleteHandler {
  constructor(element) {
    super(element)
    this.setAutocompletables(SLASH_COMMANDS.map(autocompletableForCommand))
  }

  get pattern() {
    return /^\/(.*?)(\s*)$/
  }

  // The base implementation fetches autocompletables from a URL and would
  // resolve with nothing when no URL is set, wiping the local command list,
  // so serve the list installed in the constructor instead.
  loadAutocompletables(query, callback) {
    callback()
  }

  // Mentions render avatar buttons; commands must use the same autocomplete__btn
  // chrome (not noResultsLabel HTML) so suggestion-option's reversed text color
  // does not paint a white Discord-like overlay on dark Campfire.
  fetchResultsForQuery(query, callback) {
    this.loadAutocompletables(query, () => {
      const html = this.autocompletablesMatchingQuery(query).map(renderCommandOption).join("")
      callback(html)
    })
  }

  didShowResults(selectElement) {
    selectElement.classList.add("rich_text", "autocomplete__list--commands")
  }

  insertAutocompletable(autocompletable, range) {
    if (range) { this.#editor.setSelectedRange(range) }
    this.#editor.insertString(`/${autocompletable.name} `)
  }

  getOffsetsAtPosition(position) {
    return this.#editor.getClientRectAtPosition(position) || {}
  }

  get #editor() {
    return this.element.editor
  }
}
