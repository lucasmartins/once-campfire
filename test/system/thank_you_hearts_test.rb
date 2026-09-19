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

  test "mid-burst particles actually paint (computed opacity rises above zero)" do
    page.execute_script "window.campfireTest.burstHearts()"
    assert_selector ".heart-burst__particle", wait: 5

    # Sample every particle's computed opacity across the burst window
    # (spawn 550ms + delay 120ms + rise 700ms max ≈ 1.4s). A particle past
    # its 6% keyframe must read opacity > 0 — spawn alone proves nothing.
    samples = 6.times.map do
      sleep 0.2
      page.evaluate_script %(
        Array.from(document.querySelectorAll(".heart-burst__particle")).map(el => {
          const rise = el.getAnimations().find(a => a.effect?.getKeyframes?.().some(kf => kf.opacity !== undefined))
          return {
            opacity: parseFloat(getComputedStyle(el).opacity),
            keyframes: rise ? rise.effect.getKeyframes().filter(kf => "opacity" in kf).map(kf => [kf.offset, kf.opacity]) : null,
            state: rise ? { progress: rise.effect.getComputedTiming().progress, currentTime: rise.currentTime,
                            duration: rise.effect.getComputedTiming().duration, delay: rise.effect.getTiming().delay } : null
          }
        })
      )
    end

    all_particles = samples.flatten(1)
    assert all_particles.any? { |p| p["opacity"]&.> 0 },
      "no particle ever reached opacity > 0 mid-burst. Samples: #{all_particles.inspect}"

    # The animation must actually progress past the 6% fade-in keyframe.
    progressed = all_particles.select { |p| p.dig("state", "progress")&.> 0.06 }
    assert progressed.any?, "no particle's heart-burst-rise animation progressed past 6%. Samples: #{all_particles.inspect}"
  end
end
