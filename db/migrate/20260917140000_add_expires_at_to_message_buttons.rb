class AddExpiresAtToMessageButtons < ActiveRecord::Migration[8.2]
  def change
    add_column :message_buttons, :expires_at, :datetime
  end
end
