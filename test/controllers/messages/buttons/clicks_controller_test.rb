require "test_helper"

class Messages::Buttons::ClicksControllerTest < ActionDispatch::IntegrationTest
  setup do
    @button = message_buttons(:approve_fourth_by_bender)
    @message = @button.message
    @bot = @button.creator
  end

  test "create records the click and enqueues the bot's webhook" do
    sign_in :jason

    assert_enqueued_with(job: Bot::WebhookJob) do
      assert_difference -> { @button.clicks.count }, 1 do
        post message_button_click_url(@message, @button)
      end
    end

    assert_response :created
    assert_equal users(:jason), @button.clicks.last.clicker
    assert_enqueued_with(job: Bot::WebhookJob, args: [ @bot, @button, @button.clicks.last ])
  end

  test "webhook delivery POSTs the button click payload to the bot" do
    sign_in :jason

    bot_messages_path = Rails.application.routes.url_helpers.room_bot_messages_path(@message.room, @bot.bot_key)
    message_path = Rails.application.routes.url_helpers.room_at_message_path(@message.room, @message)

    WebMock.stub_request(:post, webhooks(:bender).url).
      with(body: hash_including(
        kind: "message_button_click",
        button: { id: @button.id, label: "Approve", payload: "once" },
        message: { id: @message.id, path: message_path },
        room: { id: @message.room.id, name: @message.room.name, path: bot_messages_path, direct: false },
        clicked_by: { id: users(:jason).id, name: users(:jason).name }
      )).to_return(status: 200, body: "", headers: {})

    assert_difference -> { @button.clicks.count }, 1 do
      post message_button_click_url(@message, @button)
    end

    perform_enqueued_jobs
    assert_response :created
  end

  test "a successful allow click records the click and renders the button selected with siblings disabled" do
    deny = message_buttons(:deny_fourth_by_bender)
    sign_in :jason

    assert_difference -> { @button.clicks.count }, 1 do
      post message_button_click_url(@message, @button)
      assert_response :created
    end

    get room_url(@message.room)
    assert_response :success

    assert_select "##{dom_id(@button)}" do
      assert_select "button.boost__action.is-selected[disabled][aria-pressed=true]"
      assert_select "img[src*='check']", count: 1
    end
    assert_select "##{dom_id(deny)}" do
      assert_select "button.boost__action[disabled]"
      assert_select "button.is-selected", count: 0
    end
  end

  test "a successful deny click renders the deny button selected with the allow sibling disabled" do
    deny = message_buttons(:deny_fourth_by_bender)
    sign_in :jason

    assert_difference -> { deny.clicks.count }, 1 do
      post message_button_click_url(@message, deny)
      assert_response :created
    end

    get room_url(@message.room)
    assert_response :success

    assert_select "##{dom_id(deny)}" do
      assert_select "button.boost__action.is-selected[disabled][aria-pressed=true]"
      assert_select "img[src*='cancel']", count: 1
    end
    assert_select "##{dom_id(@button)}" do
      assert_select "button.boost__action[disabled]"
      assert_select "button.is-selected", count: 0
    end
  end

  test "an expired button renders disabled and muted, and clicking it is gone without recording a click" do
    expired = message_buttons(:expired_sixth_by_bender)
    sign_in :jason

    get room_url(expired.message.room)
    assert_response :success
    assert_select "##{dom_id(expired)}" do
      assert_select "button.boost__action.is-expired[disabled]"
      assert_select "button[data-controller=button-click]", count: 0
    end

    assert_no_difference -> { MessageButtonClick.count } do
      post message_button_click_url(expired.message, expired)
      assert_response :gone
    end
  end

  test "a button with a future expires_at is still clickable" do
    sign_in :jason

    @button.update!(expires_at: 10.minutes.from_now)

    assert_difference -> { @button.clicks.count }, 1 do
      post message_button_click_url(@message, @button)
      assert_response :created
    end
  end

  test "create requires authentication" do
    assert_no_difference -> { MessageButtonClick.count } do
      post message_button_click_url(@message, @button)
    end

    assert_response :redirect
  end

  test "create is not found for a message outside the clicker's rooms" do
    sign_in :jz

    assert_no_difference -> { MessageButtonClick.count } do
      post message_button_click_url(messages(:first), @button)
    end

    assert_response :not_found
  end

  test "create is not found for an unknown button" do
    sign_in :jason

    assert_no_difference -> { MessageButtonClick.count } do
      post message_button_click_url(@message, -1)
    end

    assert_response :not_found
  end
end
