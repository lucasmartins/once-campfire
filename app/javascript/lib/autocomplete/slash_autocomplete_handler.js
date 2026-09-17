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

function autocompletableForCommand({ name, description }) {
  return {
    value: name,
    name,
    description,
    noResultsLabel: `<strong>/${name}</strong> — ${description}`
  }
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

  insertAutocompletable(autocompletable, range) {
    if (range) { this.#editor.setSelectedRange(range) }
    this.#editor.insertString(`/${autocompletable.name} `)
  }

  // Anchor the popover to the caret, like the mentions handler
  getOffsetsAtPosition(position) {
    return this.#editor.getClientRectAtPosition(position) || {}
  }

  get #editor() {
    return this.element.editor
  }
}
