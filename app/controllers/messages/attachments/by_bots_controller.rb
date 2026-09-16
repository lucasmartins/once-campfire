class Messages::Attachments::ByBotsController < MessagesController
  allow_bot_access only: :show

  before_action :set_room
  before_action :set_message

  def show
    attachment = @message.attachment

    return head :not_found unless attachment.attached?

    send_data attachment.download,
      filename: attachment.filename.to_s,
      type: attachment.content_type,
      disposition: "attachment"
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
