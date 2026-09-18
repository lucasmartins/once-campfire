import { Controller } from "@hotwired/stimulus"
import FileUploader from "models/file_uploader"
import { onNextEventLoopTick, nextFrame } from "helpers/timing_helpers"
import { escapeHTML } from "helpers/string_helpers"
import { audioChipTemplate, isAudio } from "lib/audio_chip"

export default class extends Controller {
  static classes = [ "toolbar" ]
  static targets = [ "clientid", "fields", "fileList", "inputHint", "mic", "text" ]
  static values = { roomId: Number }
  static outlets = [ "messages" ]

  #files = []
  #recorder = null
  #recorderChunks = []

  connect() {
    this.#registerTestHook()

    if (!this.#usingTouchDevice) {
      onNextEventLoopTick(() => this.textTarget.focus())
    }
  }

  // Registered the same way slash_autocomplete_handler.js registers
  // window.campfireTest.setSlashCommands (PM12-S1). Debugger-console only,
  // never advertised in the UI.
  #registerTestHook() {
    if (typeof window == "undefined") return

    window.campfireTest = window.campfireTest || {}

    if (!window.campfireTest.attachAudio) {
      window.campfireTest.attachAudio = fileOrBlob => {
        const element = document.querySelector('[data-controller~="composer"]')
        const composer = element && this.application.getControllerForElementAndIdentifier(element, "composer")

        composer?.attachFile(fileOrBlob)
      }
    }
  }

  submit(event) {
    event.preventDefault()

    if (!this.fieldsTarget.disabled) {
      this.#submitFiles()
      this.#submitMessage()
      this.collapseToolbar()
      this.textTarget.focus()
    }
  }

  submitEnd(event) {
    if (!event.detail.success) {
      this.messagesOutlet.failPendingMessage(this.clientidTarget.value)
    }
  }

  toggleToolbar() {
    this.element.classList.toggle(this.toolbarClass)
    this.textTarget.focus()
  }

  collapseToolbar() {
    this.element.classList.remove(this.toolbarClass)
  }

  replaceMessageContent(content) {
    const editor = this.textTarget.editor

    editor.recordUndoEntry("Format reply")
    editor.setSelectedRange([0, editor.getDocument().toString().length])
    editor.deleteInDirection("forward")
    editor.insertHTML(content)
    editor.setSelectedRange([editor.getDocument().toString().length - 1])
  }

  submitByKeyboard(event) {
    const toolbarVisible = this.element.classList.contains(this.toolbarClass)
    const metaEnter = event.key == "Enter" && (event.metaKey || event.ctrlKey)
    const plainEnter = event.keyCode == 13 && !event.shiftKey && !event.isComposing

    if (!this.#usingTouchDevice && (metaEnter || (plainEnter && !toolbarVisible))) {
      this.submit(event)
    }
  }

  filePicked(event) {
    for (const file of event.target.files) {
      this.#files.push(file)
    }
    event.target.value = null
    this.#updateFileList()
  }

  fileUnpicked(event) {
    this.#files.splice(event.params.index, 1)
    this.#updateFileList()
  }

  // Hidden test hook entry (PM12-S1): window.campfireTest.attachAudio pushes
  // an audio file or raw blob onto the pending files as voice-message.webm.
  attachFile(fileOrBlob) {
    const file = fileOrBlob instanceof File ?
      fileOrBlob :
      new File([ fileOrBlob ], "voice-message.webm", { type: fileOrBlob.type || "audio/webm" })

    this.#files.push(file)
    this.#updateFileList()
  }

  pasteFiles(event) {
    if (event.clipboardData.files.length > 0) {
      event.preventDefault()
    }

    for (const file of event.clipboardData.files) {
      this.#files.push(file)
    }

    this.#updateFileList()
  }

  dropFiles({ detail: { files } }) {
    for (const file of files) {
      this.#files.push(file)
    }

    this.#updateFileList()
  }

  preventAttachment(event) {
    event.preventDefault()
  }

  // First click starts MediaRecorder, second click stops; the blob lands in
  // #files like any paperclip/drop/paste audio (PM12-S1).
  async toggleRecording() {
    this.#recorder ? this.#stopRecording() : await this.#startRecording()
  }

  async #startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder == "undefined") return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.#recorder = new MediaRecorder(stream)
      this.#recorderChunks = []

      this.#recorder.addEventListener("dataavailable", event => {
        if (event.data.size > 0) this.#recorderChunks.push(event.data)
      })

      this.#recorder.addEventListener("stop", () => {
        const type = this.#recorder.mimeType || "audio/webm"
        const blob = new Blob(this.#recorderChunks, { type })
        const file = new File([ blob ], "voice-message.webm", { type })
        this.#files.push(file)
        this.#updateFileList()

        stream.getTracks().forEach(track => track.stop())
        this.#recorder = null
        this.#setRecordingUI(false)
      })

      this.#recorder.start()
      this.#setRecordingUI(true)
    } catch {
      // Mic permission denied or no device: stay silent, no recording UI.
      this.#recorder = null
      this.#setRecordingUI(false)
    }
  }

  #stopRecording() {
    if (this.#recorder?.state != "inactive") this.#recorder.stop()
  }

  #setRecordingUI(recording) {
    this.micTarget.classList.toggle("composer__mic-btn--recording", recording)
    this.#swapHint(recording)
  }

  #swapHint(recording) {
    if (!this.hasInputHintTarget) return

    const hint = this.inputHintTarget
    const next = recording ? hint.dataset.recordingSrc : hint.dataset.defaultSrc
    if (next) hint.src = next
  }

  online() {
    this.fieldsTarget.disabled = false
  }

  offline() {
    this.fieldsTarget.disabled = true
  }

  get #usingTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
  }

  async #submitMessage() {
    if (this.#validInput()) {
      const clientMessageId = this.#generateClientId()

      await this.messagesOutlet.insertPendingMessage(clientMessageId, this.textTarget)
      await nextFrame()

      this.clientidTarget.value = clientMessageId
      this.element.requestSubmit()
      this.#reset()
    }
  }

  #validInput() {
    return this.textTarget.textContent.trim().length > 0
  }

  async #submitFiles() {
    const files = this.#files

    this.#files = []
    this.#updateFileList()

    for (const file of files) {
      const clientMessageId = this.#generateClientId()
      const uploader = new FileUploader(file, this.element.action, clientMessageId, this.#uploadProgress.bind(this))

      const body = this.#pendingUploadProgress(file.name)
      await this.messagesOutlet.insertPendingMessage(clientMessageId, body)

      const resp = await uploader.upload()

      Turbo.renderStreamMessage(resp)
    }
  }

  #uploadProgress(percent, clientMessageId, file) {
    const body = this.#pendingUploadProgress(file.name, percent)
    this.messagesOutlet.updatePendingMessage(clientMessageId, body)
  }

  #generateClientId() {
    return Math.random().toString(36).slice(2)
  }

  #reset() {
    this.textTarget.value = ""
  }

  #updateFileList() {
    this.#files.sort((a, b) => a.name.localeCompare(b.name))

    const fileNodes = this.#files.map((file, index) => {
      if (isAudio(file)) return this.#audioFileNode(file, index)

      const filename = file.name.split(".").slice(0, -1).join(".")
      const extension = file.name.split(".").pop()

      const node = document.createElement("button")
      node.setAttribute("type","button")
      node.setAttribute("style","gap: 0")
      node.dataset.action = "composer#fileUnpicked"
      node.dataset.composerIndexParam = index
      node.className = "btn btn--plain composer__file txt-normal position-relative unpad flex-column"
      node.innerHTML = file.type.match(/^image\/.*/) ? `<img role="presentation" class="flex-item-no-shrink composer__file-thumbnail" src="${URL.createObjectURL(file)}">` : `<span class="composer__file-thumbnail composer__file-thumbnail--common colorize--black"></span>`
      node.innerHTML += `<span class="pad-inline txt-small flex align-center max-width composer__file-caption"><span class="overflow-ellipsis">${escapeHTML(filename)}.</span><span class="flex-item-no-shrink">${escapeHTML(extension)}</span></span>`

      return node
    })

    this.fileListTarget.replaceChildren(...fileNodes)
  }

  #audioFileNode(file, index) {
    const template = document.createElement("template")
    template.innerHTML = audioChipTemplate({ filename: file.name, index }).trim()

    return template.content.firstChild
  }

  #pendingUploadProgress(filename, percent=0) {
    return `
      <div class="message__pending-upload flex align-center gap" style="--percentage: ${percent}%">
        <div class="composer__file-thumbnail composer__file-thumbnail--common colorize--black borderless flex-item-no-shrink"></div>
        <div>${escapeHTML(filename)} - <span>${percent}%</span></div>
      </div>
    `
  }
}
