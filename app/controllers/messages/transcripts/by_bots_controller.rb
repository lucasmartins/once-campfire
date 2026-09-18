class Messages::Transcripts::ByBotsController < ApplicationController
  allow_bot_access only: :create

  before_action :set_room
  before_action :set_message

  def create
    text = JSON.parse(request.raw_post.presence || "{}")["text"].to_s.truncate(2000)
    Rails.cache.write([ "audio-transcript", @message.id ], text, expires_in: 7.days)
    @message.broadcast_replace_to @room, :messages, target: [ @message, :presentation ],
      partial: "messages/presentation", attributes: { maintain_scroll: true }
    head :no_content
  rescue JSON::ParserError
    head :unprocessable_content
  end

  private
    def set_room
      @room = Current.user.rooms.find_by(id: params[:room_id])
      head :not_found unless @room
    end

    def set_message
      @message = @room.messages.find_by(id: params[:id])
      head :not_found unless @message
    end
end
