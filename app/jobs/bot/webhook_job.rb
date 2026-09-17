class Bot::WebhookJob < ApplicationJob
  def perform(bot, message, click = nil)
    bot.deliver_webhook(message, click)
  end
end
