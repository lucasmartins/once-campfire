class Bot::SlashCommandsController < ApplicationController
  allow_bot_access only: :create

  before_action :set_room

  def create
    Rails.cache.write(
      [ "campfire-slash-commands", @room.id, Current.user.id ],
      sanitize_commands,
      expires_in: 12.hours
    )
    head :no_content
  end

  private
    def set_room
      @room = Current.user.rooms.find_by(id: params[:room_id])
      head :not_found unless @room
    end

    def sanitize_commands
      parsed = JSON.parse(request.raw_post.presence || "[]")
      rows = parsed.is_a?(Hash) ? parsed["commands"] : parsed
      Array(rows).first(200).filter_map { |row|
        next unless row.is_a?(Hash)
        name = row["name"].to_s.strip.downcase.gsub(/[^a-z0-9_-]/, "")
        next if name.blank? || name.length > 64
        {
          "name" => name,
          "description" => row["description"].to_s.truncate(200),
          "aliases" => Array(row["aliases"]).map { |a| a.to_s.strip.downcase.gsub(/[^a-z0-9_-]/, "") }.reject(&:blank?).first(8)
        }
      }
    rescue JSON::ParserError
      []
    end
end
