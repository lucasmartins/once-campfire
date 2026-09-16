# Sweeps bot indicators whose TTL has passed: broadcasts the stop so clients
# clear the hint, then removes the row. A refresh re-points the same row at a
# later expiry, so a sweep racing a heartbeat becomes a no-op.
#
# Plain Resque has no scheduler, so delays are modelled in the data instead:
# every heartbeat (and boot) enqueues a sweep, and a sweep re-enqueues itself
# while any rows remain. The chain therefore only ends once every indicator
# has been swept - a bot that stops posting still gets its stop broadcast,
# and nothing churns while no indicators exist.
class Bot::Indicators::SweepJob < ApplicationJob
  def perform
    Bot::Indicator.expired.find_each(&:expire)
    self.class.perform_later if Bot::Indicator.exists?
  end
end
