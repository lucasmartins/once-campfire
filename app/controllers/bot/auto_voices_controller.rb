class Bot::AutoVoicesController < ApplicationController
  allow_bot_access only: :show

  before_action :set_room

  def show
    render json: { enabled: AutoVoice.enabled?(@room) }
  end

  private
    def set_room
      @room = Current.user.rooms.find_by(id: params[:room_id])
      head :not_found unless @room
    end
end
