require "test_helper"

class Bot::IndicatorsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @room = rooms(:watercooler)
    @bot_key = users(:bender).bot_key
    @headers = { "Content-Type" => "application/json" }
  end

  test "a member bot posting typing gets a 204" do
    assert_difference -> { Bot::Indicator.count }, +1 do
      post room_bot_bot_indicators_url(@room, @bot_key, :typing), headers: @headers
    end

    assert_response :no_content
    assert_equal "", response.body
  end

  test "thinking is a valid kind" do
    post room_bot_bot_indicators_url(@room, @bot_key, :thinking), headers: @headers

    assert_response :no_content
    assert_equal "thinking", Bot::Indicator.last.kind
  end

  test "an invalid kind is not found" do
    post room_bot_bot_indicators_url(@room, @bot_key, :yawning), headers: @headers

    assert_response :not_found
    assert_no_enqueued_jobs
  end

  test "a non-member bot is not found" do
    assert_not rooms(:designers).users.include?(users(:bender)), "bender must be outside designers for this test"

    assert_no_difference -> { Bot::Indicator.count } do
      post room_bot_bot_indicators_url(rooms(:designers), @bot_key, :typing), headers: @headers
    end

    assert_response :not_found
  end

  test "an invalid bot key redirects to sign-in" do
    assert_no_difference -> { Bot::Indicator.count } do
      post room_bot_bot_indicators_url(@room, "0-nope", :typing)
    end

    assert_response :redirect
  end

  test "an expired indicator comes back to life when refreshed" do
    travel_to 2.minutes.ago do
      post room_bot_bot_indicators_url(@room, @bot_key, :typing), headers: @headers
    end
    Bot::Indicator.last.update!(expires_at: 1.minute.ago)
    assert_predicate Bot::Indicator.last, :expired?

    post room_bot_bot_indicators_url(@room, @bot_key, :typing), headers: @headers

    assert_response :no_content
    indicator = Bot::Indicator.sole
    assert_in_delta Time.current, indicator.expires_at, 6.seconds
  end

  test "refreshing bumps the expiry without spawning a second indicator" do
    post room_bot_bot_indicators_url(@room, @bot_key, :typing), headers: @headers
    first = Bot::Indicator.sole

    travel 1.second do
      post room_bot_bot_indicators_url(@room, @bot_key, :typing), headers: @headers
    end

    assert_response :no_content
    assert_equal 1, Bot::Indicator.count
    assert_equal first.id, Bot::Indicator.last.id
    assert_in_delta 3.seconds.from_now, Bot::Indicator.last.expires_at, 1.second
  end

  test "ttl defaults to 3 seconds" do
    post room_bot_bot_indicators_url(@room, @bot_key, :typing), headers: @headers

    assert_in_delta 3.seconds.from_now, Bot::Indicator.last.expires_at, 2.seconds
  end

  test "ttl is clamped to the 1..10 range" do
    post room_bot_bot_indicators_url(@room, @bot_key, :typing), params: { ttl: 99 }.to_json, headers: @headers

    assert_in_delta 10.seconds.from_now, Bot::Indicator.last.expires_at, 2.seconds
  end

  test "ttl floor is 1 second" do
    post room_bot_bot_indicators_url(@room, @bot_key, :typing), params: { ttl: 0 }.to_json, headers: @headers

    assert_in_delta 1.second.from_now, Bot::Indicator.last.expires_at, 2.seconds
  end

  test "a non-numeric ttl falls back to the default" do
    post room_bot_bot_indicators_url(@room, @bot_key, :typing), params: { ttl: "soon" }.to_json, headers: @headers

    assert_response :no_content
    assert_in_delta 3.seconds.from_now, Bot::Indicator.last.expires_at, 2.seconds
  end

  test "a heartbeat enqueues a sweep" do
    assert_enqueued_with job: Bot::Indicators::SweepJob do
      post room_bot_bot_indicators_url(@room, @bot_key, :typing), headers: @headers
    end
  end

  test "a sweep racing a refresh leaves the refreshed indicator alone" do
    freeze_time do
      post room_bot_bot_indicators_url(@room, @bot_key, :typing), params: { ttl: 5 }.to_json, headers: @headers
      indicator = Bot::Indicator.last

      post room_bot_bot_indicators_url(@room, @bot_key, :typing), params: { ttl: 5 }.to_json, headers: @headers

      assert_no_broadcasts TypingNotificationsChannel.broadcasting_for(@room) do
        perform_enqueued_jobs only: Bot::Indicators::SweepJob
      end
      assert_predicate Bot::Indicator.last, :present?

      travel 6.seconds
      assert_broadcasts TypingNotificationsChannel.broadcasting_for(@room), 1 do
        perform_enqueued_jobs only: Bot::Indicators::SweepJob
      end
      assert_equal({ "action" => "stop", "user" => users(:bender).slice(:id, :name).stringify_keys, "kind" => "typing" },
        last_broadcast_for(@room))
      assert_predicate Bot::Indicator.find_by(id: indicator.id), :nil?
    end
  end

  test "expiry broadcasts stop with the kind and sweeps the row" do
    post room_bot_bot_indicators_url(@room, @bot_key, :thinking), headers: @headers

    assert_broadcasts TypingNotificationsChannel.broadcasting_for(@room), 1 do
      travel 4.seconds
      perform_enqueued_jobs only: Bot::Indicators::SweepJob
    end

    assert_equal({ "action" => "stop", "user" => users(:bender).slice(:id, :name).stringify_keys, "kind" => "thinking" },
      last_broadcast_for(@room))
    assert_empty Bot::Indicator.all
  end

  test "a sweep before the TTL is a no-op" do
    post room_bot_bot_indicators_url(@room, @bot_key, :typing), headers: @headers

    assert_no_broadcasts TypingNotificationsChannel.broadcasting_for(@room) do
      perform_enqueued_jobs only: Bot::Indicators::SweepJob
    end

    assert_predicate Bot::Indicator.last, :present?
  end

  test "the sweep chain ends once every indicator is gone" do
    post room_bot_bot_indicators_url(@room, @bot_key, :typing), headers: @headers

    travel 4.seconds
    assert_enqueued_jobs 0, only: Bot::Indicators::SweepJob do
      perform_enqueued_jobs only: Bot::Indicators::SweepJob
    end

    assert_empty Bot::Indicator.all
  end

  test "bot keys never reach the log" do
    io = StringIO.new
    original_logger = Rails.logger
    Rails.logger = ActiveSupport::Logger.new(io)
    Rails.logger.formatter = LogScrubbingFormatter.new

    begin
      post room_bot_bot_indicators_url(@room, @bot_key, :typing), headers: @headers

      assert_response :no_content
      assert_not_includes io.string, @bot_key
      assert_not_includes io.string, users(:bender).bot_token
      assert_includes io.string, "/rooms/#{@room.id}/[FILTERED]/indicators/typing"
    ensure
      Rails.logger = original_logger
    end
  end

  private
    def last_broadcast_for(room)
      ActionCable.server.pubsub.broadcasts(TypingNotificationsChannel.broadcasting_for(room)).last.then { JSON.parse(it) }
    end
end
