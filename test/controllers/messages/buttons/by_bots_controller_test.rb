require "test_helper"

class Messages::Buttons::ByBotsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @room = rooms(:watercooler)
    @message = messages(:seventh)
    @bot_key = users(:bender).bot_key
    @headers = { "Content-Type" => "application/json" }
  end

  test "create stores an optional ISO8601 expires_at" do
    expires_at = 15.minutes.from_now.utc

    assert_difference -> { MessageButton.count }, +1 do
      post room_bot_message_buttons_url(@room, @bot_key, @message),
        params: { label: "Approve", payload: "once", expires_at: expires_at.iso8601 }.to_json,
        headers: @headers
      assert_response :created
    end

    button = MessageButton.last
    assert_equal expires_at.to_i, button.expires_at.to_i
    assert_not button.expired?
  end

  test "create keeps expires_at nil when blank" do
    assert_difference -> { MessageButton.count }, +1 do
      post room_bot_message_buttons_url(@room, @bot_key, @message),
        params: { label: "Approve", payload: "once", expires_at: "" }.to_json,
        headers: @headers
      assert_response :created
    end

    assert_nil MessageButton.last.expires_at
  end

  test "create ignores an expires_at that is not a datetime" do
    assert_difference -> { MessageButton.count }, +1 do
      post room_bot_message_buttons_url(@room, @bot_key, @message),
        params: { label: "Approve", payload: "once", expires_at: "soon" }.to_json,
        headers: @headers
      assert_response :created
    end

    assert_nil MessageButton.last.expires_at
  end
end
