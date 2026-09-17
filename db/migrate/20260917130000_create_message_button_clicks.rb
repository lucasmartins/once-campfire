class CreateMessageButtonClicks < ActiveRecord::Migration[8.2]
  def change
    create_table :message_button_clicks do |t|
      t.references :message_button, null: false, foreign_key: { on_delete: :cascade }
      t.references :clicker, null: false, foreign_key: { to_table: :users, on_delete: :cascade }
      t.timestamps
    end
  end
end
