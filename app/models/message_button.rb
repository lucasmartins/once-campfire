class MessageButton < ApplicationRecord
  belongs_to :message, touch: true
  belongs_to :creator, class_name: "User", default: -> { Current.user }

  scope :ordered, -> { order(:created_at) }
end
