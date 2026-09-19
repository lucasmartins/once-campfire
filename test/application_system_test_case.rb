require "test_helper"

WebMock.disable!

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  # SYSTEM_TEST_BROWSER selects the engine: headless_chrome (default, CI),
  # headless_firefox (stock Gecko), or camoufox (the patched-Firefox build the
  # live Hut is verified with — see thank_you_hearts_test.rb).
  browser = ENV.fetch("SYSTEM_TEST_BROWSER", "headless_chrome")

  if browser == "camoufox"
    camoufox_bin = File.expand_path("~/.cache/camoufox/camoufox-bin")
    geckodriver = Dir.glob(File.expand_path("~/.cache/selenium/geckodriver/linux64/*/geckodriver")).max

    Capybara.register_driver :camoufox do |app|
      options = Selenium::WebDriver::Firefox::Options.new(binary: camoufox_bin, args: [ "-headless" ])
      Capybara::Selenium::Driver.new(app, browser: :firefox, options: options,
        service: Selenium::WebDriver::Service.firefox(path: geckodriver))
    end

    Capybara.default_max_wait_time = 10
    driven_by :camoufox, screen_size: [ 1400, 1400 ]
  else
    driven_by :selenium, using: browser.to_sym, screen_size: [ 1400, 1400 ]
  end

  include SystemTestHelper
end
