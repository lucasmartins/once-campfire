require "application_system_test_case"

class MessageButtonsTest < ApplicationSystemTestCase
  CHROME_BIN = [ ENV["CHROME_BIN"], "/usr/bin/google-chrome", "/usr/bin/chromium-browser",
                 Dir.glob(File.expand_path("~/.cache/selenium/chrome/linux64/*/chrome", Dir.home)).last,
                 "/var/lib/flatpak/exports/bin/org.chromium.Chromium" ].compact.find { File.executable?(_1) }

  driven_by :selenium, using: :headless_chrome, screen_size: [ 1400, 1400 ] do |options|
    if CHROME_BIN
      options.binary = CHROME_BIN
      # Chrome needs the new headless mode and a private shm to boot headless on
      # hosts without X/Wayland; legacy --headless dies with DevToolsActivePort.
      options.args << "--headless=new" << "--no-sandbox" << "--disable-dev-shm-usage" << "--disable-gpu"
    end
  end

  setup do
    sign_in "jason@37signals.com"
    join_room rooms(:watercooler)
  end

  test "clicking allow keeps a persistent selected ring that outlives the success flash" do
    allow_button = message_buttons(:approve_fourth_by_bender)
    deny_button = message_buttons(:deny_fourth_by_bender)

    find("##{dom_id(allow_button)}").click

    assert_selector "##{dom_id(allow_button)}.is-selected[disabled]", wait: 5
    assert_equal "true", find("##{dom_id(allow_button)}")["aria-pressed"]
    assert_selector "##{dom_id(deny_button)}[disabled]", wait: 5

    # The ring must survive past the 1s btn--success animation: it is not a flash.
    sleep 2
    assert_selector "##{dom_id(allow_button)}.is-selected[disabled]"

    assert MessageButtonClick.exists?(message_button: allow_button, clicker: users(:jason))
  end

  test "clicking deny selects the deny circle and disables the allow sibling" do
    allow_button = message_buttons(:approve_fourth_by_bender)
    deny_button = message_buttons(:deny_fourth_by_bender)

    find("##{dom_id(deny_button)}").click

    assert_selector "##{dom_id(deny_button)}.is-selected[disabled]", wait: 5
    assert_selector "##{dom_id(allow_button)}[disabled]", wait: 5
    refute_selector "##{dom_id(allow_button)}.is-selected"

    assert MessageButtonClick.exists?(message_button: deny_button, clicker: users(:jason))
  end

  test "an expired button is disabled and clicking it records nothing" do
    expired = message_buttons(:expired_sixth_by_bender)

    assert_selector "##{dom_id(expired)}.is-expired[disabled]", wait: 5

    # A disabled button fires no event, but even a forced POST-equivalent click must not record.
    expired_element = find("##{dom_id(expired)}")
    expired_element.click rescue Selenium::WebDriver::Error::ElementClickInterceptedError

    sleep 1
    assert_not MessageButtonClick.exists?(message_button: expired)
    assert_selector "##{dom_id(expired)}.is-expired[disabled]"
  end
end
