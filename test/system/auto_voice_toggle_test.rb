require "application_system_test_case"

class AutoVoiceToggleTest < ApplicationSystemTestCase
  setup do
    sign_in "jz@37signals.com"
    join_room rooms(:designers)
  end

  test "auto-voice toggle starts off, click selects, hook can set it" do
    assert_selector ".composer__auto-voice-btn[aria-pressed='false']"
    assert_no_selector ".composer__auto-voice-btn.is-selected"

    find(".composer__auto-voice-btn").click

    assert_selector ".composer__auto-voice-btn.is-selected[aria-pressed='true']"
    assert page.evaluate_script("window.campfireTest.autoVoice()")

    page.execute_script("window.campfireTest.setAutoVoice(false)")

    assert_selector ".composer__auto-voice-btn[aria-pressed='false']"
    assert_no_selector ".composer__auto-voice-btn.is-selected"
  end
end
