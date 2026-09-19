import { test } from "node:test"
import assert from "node:assert/strict"

import {
  HEART_SVG_PATH,
  buildHeartSVG,
  detectGratitude,
  hasBurstMessage,
  markBurstMessage,
} from "../../app/javascript/lib/heart_burst.js"

// ── detectGratitude: all four languages ────────────────────────────────────

test("detectGratitude fires on English gratitude", () => {
  assert.equal(detectGratitude("thank you!"), true)
  assert.equal(detectGratitude("THANK YOU so much for this"), true)
  assert.equal(detectGratitude("thank u, next"), true)
  assert.equal(detectGratitude("thanks!"), true)
  assert.equal(detectGratitude("Thx"), true)
})

test("detectGratitude fires on Portuguese gratitude", () => {
  assert.equal(detectGratitude("obrigado!"), true)
  assert.equal(detectGratitude("muito obrigada"), true)
  assert.equal(detectGratitude("OBRIGADO"), true)
})

test("detectGratitude fires on Spanish gratitude", () => {
  assert.equal(detectGratitude("gracias!"), true)
  assert.equal(detectGratitude("muchas Gracias por todo"), true)
})

test("detectGratitude fires on Japanese gratitude", () => {
  assert.equal(detectGratitude("arigato!"), true)
  assert.equal(detectGratitude("arigatou gozaimasu"), true)
  assert.equal(detectGratitude("どうもありがとう"), true)
})

test("detectGratitude fires on heart emojis", () => {
  assert.equal(detectGratitude("love it ❤️"), true)
  assert.equal(detectGratitude("♥"), true)
  assert.equal(detectGratitude("you're the best 🥰"), true)
  assert.equal(detectGratitude("😘😘"), true)
  assert.equal(detectGratitude("🩷"), true)
})

test("detectGratitude fires on <3 and <33, never </3", () => {
  assert.equal(detectGratitude("<3"), true)
  assert.equal(detectGratitude("here, <3"), true)
  assert.equal(detectGratitude("<333"), true)
  assert.equal(detectGratitude("it's broken </3"), false)
  assert.equal(detectGratitude("</3"), false)
})

test("detectGratitude does not fire on plain positive sentiment or plain text", () => {
  assert.equal(detectGratitude("this is great"), false)
  assert.equal(detectGratitude("nice work"), false)
  assert.equal(detectGratitude("looks awesome to me"), false)
  assert.equal(detectGratitude("plain text only"), false)
  assert.equal(detectGratitude("thinking about something"), false)
})

test("detectGratitude handles missing input without throwing", () => {
  assert.equal(detectGratitude(""), false)
  assert.equal(detectGratitude(null), false)
  assert.equal(detectGratitude(undefined), false)
  assert.equal(detectGratitude(123), false)
})

// ── heart glyph ────────────────────────────────────────────────────────────

test("buildHeartSVG inlines the Desktop 14x12 pixel heart with currentColor", () => {
  assert.equal(HEART_SVG_PATH.startsWith("M13.2 0v5.65714"), true)

  const svg = buildHeartSVG()
  assert.match(svg, /viewBox="0 0 14 12"/)
  assert.match(svg, new RegExp(`d="${HEART_SVG_PATH}"`))
  assert.match(svg, /fill="currentColor"/)
  assert.match(svg, /shape-rendering="crispEdges"/)
  assert.match(svg, /aria-hidden="true"/)
})

// ── one burst per client_message_id ────────────────────────────────────────

test("the double-fire guard marks a client_message_id exactly once", () => {
  const id = "pm17-test-id"

  assert.equal(hasBurstMessage(id), false)

  markBurstMessage(id)

  assert.equal(hasBurstMessage(id), true)
  // Re-marking is a no-op; a different id stays unmarked.
  markBurstMessage(id)
  assert.equal(hasBurstMessage(id), true)
  assert.equal(hasBurstMessage("pm17-other-id"), false)
})

test("the guard does not mark empty ids", () => {
  markBurstMessage("")
  markBurstMessage(null)
  assert.equal(hasBurstMessage(""), false)
})
