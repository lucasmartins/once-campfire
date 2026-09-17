require "test_helper"

class MessageButtonTest < ActiveSupport::TestCase
  test "expired? is false without an expires_at" do
    assert_not message_buttons(:approve_fourth_by_bender).expired?
  end

  test "expired? is false before expires_at" do
    button = message_buttons(:approve_fourth_by_bender)
    button.update!(expires_at: 10.minutes.from_now)

    assert_not button.expired?
  end

  test "expired? is true at or after expires_at" do
    assert message_buttons(:expired_sixth_by_bender).expired?

    button = message_buttons(:approve_fourth_by_bender)
    button.update!(expires_at: Time.current)
    assert button.expired?
  end

  test "deny buttons render the cancel icon" do
    assert_equal "cancel.svg", message_buttons(:deny_fourth_by_bender).icon_name
    assert_equal "check.svg", message_buttons(:approve_fourth_by_bender).icon_name
  end
end
