require "test_helper"

class Messages::Buttons::ButtonsRenderingTest < ActionDispatch::IntegrationTest
  test "message with buttons renders clickable chips wired to the click callback" do
    button = message_buttons(:approve_fourth_by_bender)
    jason = users(:jason)

    sign_in :jason
    get room_url(rooms(:watercooler))

    assert_response :success
    assert_select "##{dom_id(button)}" do
      assert_select "button.boost__action[data-controller=button-click][data-button-click-url-value=?]",
        message_button_click_path(button.message, button)
      assert_select "img[src*='check']", count: 1
      assert_select ".for-screen-reader", text: "Approve"
    end

    # Buttons render as circle actions, never as boost chips.
    assert_select ".message__buttons .boost-item", count: 0
    assert_select "button.message__action-btn[data-controller=button-click]", count: 0
    assert_select "button.boost__action[data-controller=button-click]", count: 2

    # No bot_key may leak into the page the human's browser loads.
    assert_not_includes response.body, button.creator.bot_key
  end

  test "a button the user already clicked renders selected and the whole row disabled" do
    button = message_buttons(:approve_fourth_by_bender)
    button.clicks.create!(clicker: users(:jason))

    sign_in :jason
    get room_url(rooms(:watercooler))

    assert_response :success
    assert_select "##{dom_id(button)}" do
      assert_select "button.boost__action.is-selected[disabled][aria-pressed=true]"
    end
    assert_select "##{dom_id(message_buttons(:deny_fourth_by_bender))}" do
      assert_select "button.boost__action[disabled]"
    end
  end
end
