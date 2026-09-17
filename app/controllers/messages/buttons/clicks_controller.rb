class Messages::Buttons::ClicksController < ApplicationController
  # Delivers a button interaction to the bot that created the button, webhook-style.
  # The click is POSTed by the signed-in human's browser (session cookie + CSRF via the
  # button-click Stimulus controller), never with a bot_key: browsers must not hold
  # bot credentials. The JSON shape POSTed to the bot's webhook URL is documented on
  # Webhook#button_click_payload.
  def create
    if message = Current.user.reachable_messages.find_by(id: params[:message_id])
      @message_button = message.message_buttons.find_by(id: params[:button_id])
    end

    head :not_found and return unless @message_button
    head :gone and return if @message_button.expired?

    @click = @message_button.clicks.create!(clicker: Current.user)
    @message_button.creator&.deliver_webhook_later(@message_button, @click)

    head :created
  end
end
