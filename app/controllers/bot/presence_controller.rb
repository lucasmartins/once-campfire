class Bot::PresenceController < ApplicationController
  allow_bot_access only: :show

  before_action :set_room

  def show
    memberships = @room.memberships.visible.where(user: User.without_bots).order(:user_id)

    render json: { members: memberships.map { |membership|
      {
        user_id: membership.user_id,
        connected: membership.connected?,
        last_seen_seconds_ago: membership.connected_at ? (Time.current - membership.connected_at).to_i : nil,
        connections: membership.connections
      }
    } }
  end

  private
    def set_room
      @room = Current.user.rooms.find_by(id: params[:room_id])

      head :not_found unless @room
    end
end
