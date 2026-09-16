class CreateBotIndicators < ActiveRecord::Migration[8.2]
  def change
    create_table :bot_indicators do |t|
      t.references :room, null: false, foreign_key: { on_delete: :cascade }
      t.references :bot, null: false, foreign_key: { to_table: :users, on_delete: :cascade }
      t.string :kind, null: false
      t.datetime :expires_at, null: false

      t.timestamps
    end

    add_index :bot_indicators, [ :room_id, :bot_id, :kind ], unique: true
    add_index :bot_indicators, :expires_at
  end
end
