require "test_helper"

class Messages::Attachments::ByBotsControllerTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper
  include ActionDispatch::TestProcess

  setup do
    host! "once.campfire.test"
    @room = rooms(:watercooler)
    @bot = users(:bender)
  end

  test "show returns the attachment bytes to a member bot" do
    message = create_attachment_message

    get room_bot_message_attachment_url(@room, @bot.bot_key, message)

    assert_response :success
    assert_equal "image/jpeg", response.headers["Content-Type"]&.split(";")&.first
    assert_includes response.headers["Content-Disposition"], "attachment"
    assert_includes response.headers["Content-Disposition"], "moon.jpg"
    assert_equal message.attachment.download, response.body
  end

  test "show is not found for a message without an attachment" do
    message = @room.messages.create!(body: "Just text", creator: users(:jason))

    get room_bot_message_attachment_url(@room, @bot.bot_key, message)

    assert_response :not_found
  end

  test "show is not found for a room the bot is not a member of" do
    message = create_attachment_message(room: rooms(:designers))

    get room_bot_message_attachment_url(rooms(:designers), @bot.bot_key, message)

    assert_response :not_found
  end

  test "show requires a valid bot key" do
    message = create_attachment_message

    get room_bot_message_attachment_url(@room, "invalid-bot-key", message)

    assert_response :redirect
  end

  private
    def create_attachment_message(room: @room)
      room.messages.create_with_attachment! \
        creator: users(:jason),
        client_message_id: "bot-attachment-#{room.id}",
        attachment: fixture_file_upload("moon.jpg", "image/jpeg")
    end
end
