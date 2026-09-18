module AutoVoice
  PREFIX = "auto-voice"

  def self.cache_key(room)
    [ PREFIX, room.id ]
  end

  def self.enabled?(room)
    Rails.cache.read(cache_key(room)) == true
  end

  def self.write(room, enabled)
    Rails.cache.write(cache_key(room), !!enabled, expires_in: 12.hours)
    !!enabled
  end
end
