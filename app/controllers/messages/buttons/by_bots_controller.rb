class Messages::Buttons::ByBotsController < ApplicationController
  include RawRequestBody

  allow_bot_access only: %i[ create ]

  before_action :set_message
  before_action :ensure_payload_present, only: :create

  def create
    @message_button = @message.message_buttons.create!(button_params)
    render :show, status: :created
  end

  private
    def set_message
      if room = Current.user.rooms.find_by(id: params[:room_id])
        @message = room.messages.find_by(id: params[:message_id])
      end

      head :not_found unless @message
    end

    def ensure_payload_present
      head :unprocessable_content if button_params[:label].blank? || button_params[:payload].blank?
    end

    def button_params
      @button_params ||= begin
        raw = raw_request_body
        parsed = JSON.parse(raw)
        {
          label: parsed["label"].to_s,
          payload: parsed["payload"].to_s,
          kind: (parsed["kind"].presence || "action"),
          expires_at: parse_expires_at(parsed["expires_at"])
        }
      rescue JSON::ParserError
        { label: "", payload: "", kind: "action", expires_at: nil }
      end
    end

    def parse_expires_at(value)
      Time.zone.parse(value.to_s)&.utc if value.present?
    rescue ArgumentError
      nil
    end
end
