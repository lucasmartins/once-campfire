class CreateMessageButtons < ActiveRecord::Migration[8.2]
  def change
    create_table :message_buttons do |t|
      t.references :message, null: false, foreign_key: { on_delete: :cascade }
      t.references :creator, null: false, foreign_key: { to_table: :users, on_delete: :cascade }
      t.string :label, null: false
      t.string :payload, null: false
      t.string :kind, null: false, default: "action"
      t.timestamps
    end
  end
end
