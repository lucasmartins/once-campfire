require "application_system_test_case"

# PM16-F: bot voice messages autoplay in the open room only when auto-voice
# was toggled ON in THIS page session (the toggle click is the autoplay
# gesture). A fresh page load with "on" restored from localStorage has no
# gesture, so nothing autoplays.
#
# HTMLMediaElement.prototype.play is stubbed via page.execute_script to
# record calls — we never fake a user gesture and never rely on headless
# Chrome's autoplay policy actually allowing gestureless playback.
class AutoVoiceAutoplayTest < ApplicationSystemTestCase
  setup do
    # Bender (fixture bot) is only a member of watercooler; the room under
    # test is designers, so mirror by_bots_controller_test's bot usage with a
    # membership. The system session (jz) is already a member of designers.
    @room = rooms(:designers)
    @bot = users(:bender)
    @room.memberships.find_or_create_by!(user: @bot)

    sign_in "jz@37signals.com"
    join_room @room
  end

  test "bot audio message autoplays after the toggle was clicked this session, but not after a reload" do
    stub_play_recorder
    find(".composer__auto-voice-btn").click # the gesture: unlockAutoplay fires here

    post_bot_audio_message

    assert_selector ".message .audio-chip", wait: 10
    assert played_chip_srcs.any? { |src| src.include?("/rails/active_storage/blobs/") },
      "expected play() on the new bot chip's audio element without a click, got #{played_chip_srcs.inspect}"

    # Fresh session: localStorage 'on' persists, but there is no gesture in
    # this page session, so a NEW bot audio message must NOT call play().
    visit room_url(@room)
    stub_play_recorder # reinstall: navigation reset the page's JS context
    wait_for_cable_connection
    dismiss_pwa_install_prompt

    post_bot_audio_message

    assert_selector ".message .audio-chip", count: 2, wait: 10
    assert_empty played_chip_srcs.select { |src| src.include?("/rails/active_storage/blobs/") },
      "play() must not be called on page-load-alone (no gesture this session)"
  end

  test "nothing autoplays while auto-voice is off" do
    stub_play_recorder

    post_bot_audio_message

    assert_selector ".message .audio-chip", wait: 10
    assert_empty played_chip_srcs.select { |src| src.include?("/rails/active_storage/blobs/") }
  end

  private
    # Records every HTMLMediaElement#play() call's src. Returns [] until the
    # stub is installed (before that, genuine play calls can't be observed).
    def stub_play_recorder
      page.execute_script <<~JS
        window.__played = []
        HTMLMediaElement.prototype.play = function() {
          window.__played.push(this.src || (this.currentSrc || ""))
          return Promise.resolve()
        }
      JS
    end

    def played_chip_srcs
      page.evaluate_script("window.__played || []")
    end

    # Creates a real audio attachment message as the bot, the same shape
    # Messages::ByBotsControllerTest#test_create_file produces (bot + wav
    # fixture), then broadcasts it so the open room appends the chip live.
    def post_bot_audio_message
      blob = ActiveStorage::Blob.create_and_upload!(
        io: File.open(Rails.root.join("test/fixtures/files/pm12-tiny.wav")),
        filename: "voice-message.wav", content_type: "audio/wav"
      )
      @room.messages.create_with_attachment!(attachment: blob, creator: @bot).broadcast_create
    end
end
