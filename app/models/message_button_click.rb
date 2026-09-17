class MessageButtonClick < ApplicationRecord
  belongs_to :message_button
  belongs_to :clicker, class_name: "User"

  validates :clicker, exclusion: { in: ->(click) { [ click.clicker ] }, if: -> { clicker&.bot? } }
end
