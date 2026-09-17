class MessageButton < ApplicationRecord
  belongs_to :message, touch: true
  belongs_to :creator, class_name: "User", default: -> { Current.user }
  has_many :clicks, class_name: "MessageButtonClick", dependent: :destroy

  scope :ordered, -> { order(:created_at) }

  def icon_name
    payload == "deny" ? "cancel.svg" : "check.svg"
  end
end
