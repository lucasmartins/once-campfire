class Rooms::SlashCommandsController < ApplicationController
  before_action :set_room

  def index
    commands = @room.users.where(role: :bot).order(:id).flat_map { |bot|
      Array(Rails.cache.read([ "campfire-slash-commands", @room.id, bot.id ]))
    }.uniq { |row| row["name"] }

    render json: { commands: commands }
  end

  private
    def set_room
      @room = Current.user.rooms.find_by(id: params[:room_id])
      head :not_found unless @room
    end
end
