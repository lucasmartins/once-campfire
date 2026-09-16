class Bot::IndicatorsController < ApplicationController
  allow_bot_access only: :create

  before_action :set_room
  before_action :set_kind

  def create
    ttl = Bot::Indicator.clamp_ttl(params[:ttl])
    indicator = Bot::Indicator.refresh(@room, Current.user, @kind, ttl: ttl)
    indicator.broadcast_start
    Bot::Indicators::SweepJob.perform_later

    head :no_content
  end

  private
    def set_room
      @room = Current.user.rooms.find_by(id: params[:room_id])

      head :not_found unless @room
    end

    def set_kind
      @kind = params[:kind]

      head :not_found unless Bot::Indicator::KINDS.include?(@kind)
    end
end
