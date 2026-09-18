class Rooms::AutoVoicesController < ApplicationController
  before_action :set_room

  def update
    enabled = ActiveModel::Type::Boolean.new.cast(parsed_enabled)
    AutoVoice.write(@room, enabled)
    head :no_content
  end

  private
    def set_room
      @room = Current.user.rooms.find_by(id: params[:room_id])
      head :not_found unless @room
    end

    def parsed_enabled
      if request.content_mime_type&.json?
        JSON.parse(request.raw_post.presence || "{}")["enabled"]
      else
        params[:enabled]
      end
    rescue JSON::ParserError
      false
    end
end
