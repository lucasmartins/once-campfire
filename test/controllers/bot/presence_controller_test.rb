require "test_helper"

class Bot::PresenceControllerTest < ActionDispatch::IntegrationTest
  setup do
    @room = rooms(:watercooler)
    @bot_key = users(:bender).bot_key
    @headers = { "Content-Type" => "application/json" }
  end

  test "a member bot gets a JSON presence snapshot ordered by user_id" do
    travel_to Time.current do
      memberships(:david_watercooler).update_column :connected_at, 3.seconds.ago
      memberships(:david_watercooler).update_column :connections, 2
      memberships(:jason_watercooler).update_column :connected_at, 941.seconds.ago
      memberships(:jason_watercooler).update_column :connections, 0

      get room_bot_bot_presence_url(@room, @bot_key), headers: @headers

      assert_response :ok
      members = JSON.parse(response.body).fetch("members")
      david, jason = users(:david), users(:jason)

      assert_equal [ david.id, jason.id ], members.map { |member| member["user_id"] }

      david_member = members.find { |member| member["user_id"] == david.id }
      assert_equal true, david_member["connected"]
      assert_equal 3, david_member["last_seen_seconds_ago"]
      assert_equal 2, david_member["connections"]

      jason_member = members.find { |member| member["user_id"] == jason.id }
      assert_equal false, jason_member["connected"]
      assert_equal 941, jason_member["last_seen_seconds_ago"]
      assert_equal 0, jason_member["connections"]
    end
  end

  test "a stale connected_at just past the TTL is disconnected" do
    stale_at = Membership::CONNECTION_TTL.ago - 1.second
    memberships(:david_watercooler).update_column :connected_at, stale_at

    get room_bot_bot_presence_url(@room, @bot_key), headers: @headers

    assert_response :ok
    member = JSON.parse(response.body).fetch("members").find { |member| member["user_id"] == users(:david).id }
    assert_equal false, member["connected"]
    assert_equal Membership::CONNECTION_TTL.to_i + 1, member["last_seen_seconds_ago"]
  end

  test "a nil connected_at reports null last_seen_seconds_ago" do
    memberships(:david_watercooler).update_column :connected_at, nil

    get room_bot_bot_presence_url(@room, @bot_key), headers: @headers

    assert_response :ok
    member = JSON.parse(response.body).fetch("members").find { |member| member["user_id"] == users(:david).id }
    assert_equal false, member["connected"]
    assert_nil member["last_seen_seconds_ago"]
    assert_equal 0, member["connections"]
  end

  test "a non-member bot is not found" do
    assert_not rooms(:designers).users.include?(users(:bender)), "bender must be outside designers for this test"

    get room_bot_bot_presence_url(rooms(:designers), @bot_key), headers: @headers

    assert_response :not_found
  end

  test "an invalid bot key redirects to sign-in" do
    get room_bot_bot_presence_url(@room, "0-nope")

    assert_response :redirect
  end

  test "bot memberships are not listed in members" do
    get room_bot_bot_presence_url(@room, @bot_key), headers: @headers

    assert_response :ok
    member_ids = JSON.parse(response.body).fetch("members").map { |member| member["user_id"] }
    assert_not_includes member_ids, users(:bender).id
    assert_not_includes member_ids, *User.where(role: :bot).ids
  end

  test "invisible memberships are excluded" do
    memberships(:jason_watercooler).update_column :involvement, "invisible"

    get room_bot_bot_presence_url(@room, @bot_key), headers: @headers

    assert_response :ok
    member_ids = JSON.parse(response.body).fetch("members").map { |member| member["user_id"] }
    assert_not_includes member_ids, users(:jason).id
  end
end
