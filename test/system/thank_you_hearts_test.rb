require "application_system_test_case"

class ThankYouHeartsTest < ApplicationSystemTestCase
  setup do
    sign_in "jz@37signals.com"
    join_room rooms(:designers)
  end

  test "sending a gratitude message bursts hearts that bubble up and disappear" do
    send_message "obrigado!"

    # Composer burst fires immediately on the optimistic local send.
    assert_selector ".heart-burst__particle", wait: 5

    # Particles retire on animationend (spawn window 550ms + rise 700ms max).
    assert_no_selector ".heart-burst__particle", wait: 10
  end

  test "a plain message spawns no hearts" do
    send_message "nice work"

    assert_no_selector ".heart-burst__particle", wait: 2
  end

  test "window.campfireTest.burstHearts fires a burst on the open room" do
    page.execute_script "window.campfireTest.burstHearts()"

    assert_selector ".heart-burst__particle", wait: 5
    assert_no_selector ".heart-burst__particle", wait: 10
  end
end
