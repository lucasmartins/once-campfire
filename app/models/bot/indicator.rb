# A bot-driven presence hint ("typing"/"thinking") in a room. One row per
# (room, bot, kind); each heartbeat POST refreshes +expires_at+. Sweeping is
# lazy: Bot::Indicators::SweepJob broadcasts the stop and destroys the row once
# the moment passes without a refresh, so an indicator always disappears even
# if the bot goes silent.
class Bot::Indicator < ApplicationRecord
  # Rails derives the table from the demodulized class name ("indicators");
  # ours follows the namespaced file, bot_indicators.
  self.table_name = "bot_indicators"

  KINDS = %w[ typing thinking ].freeze

  DEFAULT_TTL = 3
  MIN_TTL = 1
  MAX_TTL = 10

  belongs_to :room
  belongs_to :bot, class_name: "User"

  validates :kind, inclusion: { in: KINDS }

  scope :expired, -> { where(expires_at: ..Time.current) }

  class << self
    # Creates or refreshes the indicator for (room, bot, kind), returning the row.
    # The row id survives a refresh, so a sweep that read the row earlier still
    # re-checks the bumped expiry before doing anything.
    def refresh(room, bot, kind, ttl: DEFAULT_TTL)
      now = Time.current
      upsert({ room_id: room.id, bot_id: bot.id, kind: kind, expires_at: ttl.seconds.from_now, created_at: now, updated_at: now },
        unique_by: %i[ room_id bot_id kind ])
      find_by(room: room, bot: bot, kind: kind)
    end

    def clamp_ttl(value)
      Integer(value).clamp(MIN_TTL, MAX_TTL)
    rescue ArgumentError, TypeError
      DEFAULT_TTL
    end
  end

  def expired?
    expires_at <= Time.current
  end

  # Broadcasts the stop and removes the row, but only if the TTL really passed:
  # a sweep racing a heartbeat must not cut short the refreshed expiry.
  def expire
    transaction do
      lock!
      raise ActiveRecord::Rollback unless expired?

      broadcast_stop
      destroy!
    end
  end

  def broadcast_start
    # "typing" rides the same "start" action humans broadcast; "thinking" gets
    # its own action so the room UI can tell the two hints apart.
    action = kind == "thinking" ? :thinking : :start
    TypingNotificationsChannel.broadcast_to room,
      action: action, user: bot.slice(:id, :name), kind: kind
  end

  def broadcast_stop
    TypingNotificationsChannel.broadcast_to room,
      action: :stop, user: bot.slice(:id, :name), kind: kind
  end
end
