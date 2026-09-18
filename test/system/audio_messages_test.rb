require "application_system_test_case"

class AudioMessagesTest < ApplicationSystemTestCase
  setup do
    sign_in "jz@37signals.com"
    join_room rooms(:designers)
  end

  test "attaching audio via the paperclip shows the composer chip, sends, and renders the log chip" do
    attach_file nil, Rails.root.join("test/fixtures/files/pm12-tiny.wav"), make_visible: true

    assert_selector ".composer__filelist .audio-chip", text: "pm12-tiny.wav"
    # Transcript slot exists but ships EMPTY (and collapsed) in S1 — no STT text.
    assert_selector ".composer__filelist .audio-chip .audio-chip__transcript", visible: false
    assert_no_selector ".composer__filelist .audio-chip .audio-chip__transcript", visible: true
    assert_no_selector ".composer__filelist .composer__file"

    click_on "send"

    assert_selector ".message .audio-chip", wait: 10
    within last_message do
      assert_selector ".audio-chip__filename", text: "pm12-tiny.wav"
      assert_selector ".audio-chip__transcript", visible: false
      assert_selector ".audio-chip__play"
      # Not the download-link row: no Download/Share attachment actions.
      assert_no_text "Download pm12-tiny.wav"
      assert_no_selector "a.message__action-btn"
    end
  end

  test "window.campfireTest.attachAudio wraps a raw blob as voice-message.webm" do
    page.execute_script <<~JS
      const bytes = atob("UklGRgAAAABXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAAZGF0YQAAAAA=")
      const buffer = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i)
      window.campfireTest.attachAudio(new Blob([ buffer ], { type: "audio/wav" }))
    JS

    assert_selector ".composer__filelist .audio-chip", text: "voice-message.webm"

    click_on "send"

    assert_selector ".message .audio-chip", wait: 10
    within last_message do
      assert_selector ".audio-chip__filename", text: "voice-message.webm"
    end
  end

  test "mic button toggles recording chrome without a real capture" do
    # getUserMedia is not available headless; assert only that the button and
    # hint exist and clicking does not blow up (no fake getUserMedia per spec).
    assert_selector ".composer__mic-btn"
    assert_selector ".composer__input-hint"

    find(".composer__mic-btn").click

    assert_no_selector ".composer__mic-btn--recording"
  end

  private
    def last_message
      all(".messages .message").last
    end
end
