require "application_system_test_case"

class AudioMessagesTest < ApplicationSystemTestCase
  setup do
    sign_in "jz@37signals.com"
    join_room rooms(:designers)
  end

  test "attaching audio via the paperclip shows the composer chip, sends, and renders the log chip" do
    attach_file nil, Rails.root.join("test/fixtures/files/pm12-tiny.wav"), make_visible: true

    # PM16-B: the chip lives inside the composer input row, not the filelist.
    assert_selector ".composer__input .audio-chip"
    assert_no_selector ".composer__filelist .audio-chip"
    assert_no_selector ".composer__filelist .composer__file"

    # Chip content: play + waveform canvas + duration + X remove; NO filename.
    assert_selector ".composer__input .audio-chip .audio-chip__play"
    assert_selector ".composer__input .audio-chip canvas.audio-chip__wave"
    assert_selector ".composer__input .audio-chip .audio-chip__duration"
    assert_selector ".composer__input .audio-chip .audio-chip__remove"
    assert_no_selector ".composer__input .audio-chip .audio-chip__filename"
    assert_no_text "pm12-tiny.wav"

    # PM16-B testability: the canvas actually paints after client-side
    # decodeAudioData on the fixture wav (silent clip → minimum-height bars).
    assert wave_painted?(".composer__input .audio-chip canvas.audio-chip__wave"),
      "composer waveform canvas never painted"

    click_on "send"

    assert_selector ".message .audio-chip", wait: 10
    within last_message do
      # PM16-C: log chip drops the filename, keeps play + duration + wave.
      assert_no_selector ".audio-chip__filename"
      assert_selector ".audio-chip__play"
      assert_selector ".audio-chip__duration"
      assert_selector "canvas.audio-chip__wave"
      assert_selector ".audio-chip__transcript", visible: false
      # Not the download-link row: no Download/Share attachment actions.
      assert_no_text "Download pm12-tiny.wav"
      assert_no_selector "a.message__action-btn"
    end

    assert wave_painted?(".message .audio-chip canvas.audio-chip__wave", within: last_message),
      "log waveform canvas never painted"
  end

  test "window.campfireTest.attachAudio wraps a raw blob as voice-message.webm" do
    page.execute_script <<~JS
      const bytes = atob("UklGRgAAAABXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAAZGF0YQAAAAA=")
      const buffer = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i)
      window.campfireTest.attachAudio(new Blob([ buffer ], { type: "audio/wav" }))
    JS

    # Same in-composer chip shape as the paperclip path, minus any filename.
    assert_selector ".composer__input .audio-chip"
    assert_selector ".composer__input .audio-chip canvas.audio-chip__wave"
    assert_selector ".composer__input .audio-chip .audio-chip__remove"
    assert_no_selector ".composer__input .audio-chip .audio-chip__filename"

    click_on "send"

    assert_selector ".message .audio-chip", wait: 10
    within last_message do
      assert_no_selector ".audio-chip__filename"
    end
  end

  test "X on the pending chip unpicks the audio file" do
    attach_file nil, Rails.root.join("test/fixtures/files/pm12-tiny.wav"), make_visible: true

    assert_selector ".composer__input .audio-chip"

    find(".composer__input .audio-chip .audio-chip__remove").click

    assert_no_selector ".composer__input .audio-chip", wait: 5
  end

  test "play on the pending chip starts playback of the local object URL" do
    attach_file nil, Rails.root.join("test/fixtures/files/pm12-tiny.wav"), make_visible: true

    assert_selector ".composer__input .audio-chip"

    find(".composer__input .audio-chip .audio-chip__play").click

    assert_selector ".composer__input .audio-chip.audio-chip--playing", wait: 5
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

    # Polls until the canvas has non-transparent pixels (decodeAudioData and
    # the bar drawing are async). Returns false if it never paints.
    def wave_painted?(selector, within: nil)
      scope = within || page
      canvas = scope.find(selector, wait: 10)
      deadline = Time.now + 10

      while Time.now < deadline
        painted = page.evaluate_script(
          "(() => { const c = arguments[0]; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;" \
          "for (let i = 3; i < d.length; i += 4) { if (d[i] !== 0) return true } return false })()",
          canvas
        )
        return true if painted
        sleep 0.25
      end

      false
    rescue Capybara::ElementNotFound
      false
    end
end
