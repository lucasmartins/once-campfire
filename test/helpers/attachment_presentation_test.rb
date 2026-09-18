require "test_helper"

class Messages::AttachmentPresentationTest < ActionView::TestCase
  test "audio/mpeg attachment renders the shared audio chip, not the download-link row" do
    message = Message.create! room: rooms(:pets), body: "<div></div>", client_message_id: "audio-001", creator: users(:jason)
    message.attachment.attach io: File.open(Rails.root.join("test/fixtures/files/pm12-tiny.wav")), filename: "voice-message.mp3", content_type: "audio/mpeg"

    presentation = view.message_presentation(message)

    assert_match /class="[^"]*audio-chip\b/, presentation
    assert_match /audio-chip__filename/, presentation
    assert_match /audio-chip__transcript/, presentation
    assert_match /Play audio/, presentation
    assert_no_match /message__action-btn/, presentation
    assert_no_match /Download /, presentation
  end

  test "audio chip transcript slot ships empty in S1" do
    message = Message.create! room: rooms(:pets), body: "<div></div>", client_message_id: "audio-002", creator: users(:jason)
    message.attachment.attach io: File.open(Rails.root.join("test/fixtures/files/pm12-tiny.wav")), filename: "voice-message.wav", content_type: "audio/wav"

    presentation = view.message_presentation(message)

    assert_match /<span class="audio-chip__transcript"><\/span>/, presentation
    assert_no_match /audio-chip__transcript">[^<]/, presentation
  end

  test "non-audio attachments keep the download-link row" do
    message = Message.create! room: rooms(:pets), body: "<div></div>", client_message_id: "audio-003", creator: users(:jason)
    message.attachment.attach io: File.open(Rails.root.join("test/fixtures/files/moon.jpg")), filename: "moon.jpg", content_type: "image/jpeg"

    presentation = view.message_presentation(message)

    assert_no_match /audio-chip/, presentation
  end

  test "wav attachment attached as audio/wav renders the chip" do
    message = Message.create! room: rooms(:pets), body: "<div></div>", client_message_id: "audio-004", creator: users(:jason)
    message.attachment.attach io: File.open(Rails.root.join("test/fixtures/files/pm12-tiny.wav")), filename: "pm12-tiny.wav", content_type: "audio/wav"
    message.attachment.analyze

    presentation = view.message_presentation(message)

    assert_match /audio-chip__filename/, presentation
    assert_no_match /message__action-btn/, presentation
  end
end
