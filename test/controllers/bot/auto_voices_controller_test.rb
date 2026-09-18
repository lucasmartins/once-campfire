require "test_helper"

class Bot::AutoVoicesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @room = rooms(:watercooler)
    @bot_key = users(:bender).bot_key
    @old_cache = Rails.cache
    Rails.cache = ActiveSupport::Cache::MemoryStore.new
  end

  teardown { Rails.cache = @old_cache }

  test "member bot GET returns enabled false by default" do
    get room_bot_bot_auto_voice_url(@room, @bot_key)
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal false, body["enabled"]
  end

  test "member bot GET returns enabled true after a human POST" do
    sign_in :david
    post room_auto_voice_url(@room), params: { enabled: true }.to_json,
      headers: { "Content-Type" => "application/json" }
    assert_response :no_content

    get room_bot_bot_auto_voice_url(@room, @bot_key)
    assert_response :success
    assert_equal true, JSON.parse(response.body)["enabled"]
  end

  test "invalid bot key redirects" do
    get room_bot_bot_auto_voice_url(@room, "0-nope")
    assert_response :redirect
  end
end
