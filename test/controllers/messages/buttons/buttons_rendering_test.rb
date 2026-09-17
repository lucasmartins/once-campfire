require "test_helper"

class Messages::Buttons::ButtonsRenderingTest < ActionDispatch::IntegrationTest
  test "message with buttons renders clickable chips wired to the click callback" do
    button = message_buttons(:approve_fourth_by_bender)
    jason = users(:jason)

    sign_in :jason
    get room_url(rooms(:watercooler))

    assert_response :success
    assert_select "##{dom_id(button)}" do
      assert_select "button[data-controller=button-click][data-button-click-url-value=?]",
        message_button_click_path(button.message, button), text: "Approve"
    end

    # The chip is a real button wired to the Stimulus click action (no passive span).
    assert_select ".boost-item > button.btn", text: "Approve"
    assert_select ".boost-item > button.btn[data-controller]", count: 1

    # No bot_key may leak into the page the human's browser loads.
    assert_not_includes response.body, button.creator.bot_key
  end
end
