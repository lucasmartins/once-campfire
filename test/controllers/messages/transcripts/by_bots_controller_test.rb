require "test_helper"

class Messages::Transcripts::ByBotsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @room = rooms(:watercooler)
    @bot_key = users(:bender).bot_key
    @headers = { "Content-Type" => "application/json" }
    @old_cache = Rails.cache
    Rails.cache = ActiveSupport::Cache::MemoryStore.new
    @message = Message.create!(room: @room, body: "<div></div>", client_message_id: "tx-001", creator: users(:jason))
    @message.attachment.attach io: File.open(Rails.root.join("test/fixtures/files/pm12-tiny.wav")),
      filename: "pm12-tiny.wav", content_type: "audio/wav"
  end

  teardown { Rails.cache = @old_cache }

  test "member bot posting transcript gets 204 and chip renders the text" do
    post room_bot_message_transcript_url(@room, @bot_key, @message),
      params: { text: "Here's an audio message for testing." }.to_json, headers: @headers
    assert_response :no_content
    assert_equal "Here's an audio message for testing.", Rails.cache.read([ "audio-transcript", @message.id ])

    sign_in :david
    get room_at_message_url(@room, @message)
    assert_response :success
    assert_match(/audio message for testing/, response.body)
  end

  test "invalid bot key redirects" do
    post room_bot_message_transcript_url(@room, "0-nope", @message),
      params: { text: "x" }.to_json, headers: @headers
    assert_response :redirect
  end
end
