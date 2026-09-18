require "test_helper"

class Bot::SlashCommandsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @room = rooms(:watercooler)
    @bot_key = users(:bender).bot_key
    @headers = { "Content-Type" => "application/json" }
    @old_cache = Rails.cache
    Rails.cache = ActiveSupport::Cache::MemoryStore.new
  end

  teardown do
    Rails.cache = @old_cache
  end

  test "member bot posting commands gets 204 and human GET sees them" do
    payload = [ { name: "kanban", description: "Board and profile workflow", aliases: [ "kb" ] } ].to_json

    post room_bot_bot_slash_commands_url(@room, @bot_key), params: payload, headers: @headers
    assert_response :no_content

    sign_in :david
    get room_slash_commands_url(@room), as: :json
    assert_response :success
    names = response.parsed_body.fetch("commands").map { |c| c["name"] }
    assert_includes names, "kanban"
  end

  test "invalid bot key redirects" do
    post room_bot_bot_slash_commands_url(@room, "0-nope"), params: "[]", headers: @headers
    assert_response :redirect
  end

  test "non-member bot is not found" do
    post room_bot_bot_slash_commands_url(rooms(:designers), @bot_key), params: "[]", headers: @headers
    assert_response :not_found
  end
end
