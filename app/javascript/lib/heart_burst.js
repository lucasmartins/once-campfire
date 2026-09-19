// Thank-you hearts (PM17) — port of the Hermes Desktop vibe-hearts effect
// (apps/desktop vibe-hearts.tsx over particles/particle-field.tsx, motion
// contract copied verbatim) to vanilla Campfire DOM. Dependency-free like
// lib/audio_chip.js so node --test can import it.
//
// Two halves:
//   detectGratitude(text) — the reaction lexicon (Desktop agent/reactions.py
//     plus the four Campfire languages), token-free regex.
//   burstHearts(anchorEl) — spawn the Desktop-configured particle burst into
//     an absolutely-positioned lane over the anchor, retire on animationend,
//     respect prefers-reduced-motion, cap alive particles.

// Pixel-art heart from @nous-research/ui (14×12), crisp + currentColor.
export const HEART_SVG_PATH = "M13.2 0v5.65714h-1.8857v1.88572H9.42857v1.88571H7.54286v1.88573H5.65714V9.42857H3.77143V7.54286H1.88571V5.65714H0V0h5.65714v1.88571h1.88572V0z"

// Light pink reads on both light and dark chat surfaces (Desktop reference).
export const HEART_COLOR = "#ff9ec4"

export function buildHeartSVG() {
  return `<svg aria-hidden="true" fill="none" shape-rendering="crispEdges" viewBox="0 0 14 12" xmlns="http://www.w3.org/2000/svg"><path d="${HEART_SVG_PATH}" fill="currentColor"></path></svg>`
}

// ── Detection ───────────────────────────────────────────────────────────────

// Hearts + affection faces (❤ ♥ 🥰 😍 😘 💕 💖 💗 💞 💛 💜 💚 💙 💓 💘 💝 🩷).
const HEART_EMOJI_CLASS = "[\\u2764\\u2665\\u{1F970}\\u{1F60D}\\u{1F618}\\u{1F495}\\u{1F496}\\u{1F497}\\u{1F49E}\\u{1F49B}\\u{1F49C}\\u{1F49A}\\u{1F499}\\u{1F493}\\u{1F498}\\u{1F49D}\\u{1FA77}]"

// Gratitude + affection aimed at the room (Desktop's agent/reactions.py
// lexicon + obrigado/gracias/arigato/ありがとう), NOT general positive
// sentiment — "this is great" must not fire.
const GRATITUDE_REGEX = new RegExp([
  "\\bthank\\s*(?:you|u)\\b",
  "\\b(?:thanks|thx|tysm|ty)\\b",
  "\\bgood\\s*bot\\b",
  "\\bi\\s*(?:love|luv)\\s*(?:you|u|ya)\\b",
  "\\b(?:love|luv)\\s*(?:you|u|ya)\\b",
  "\\bily(?:sm)?\\b",
  "\\bobrigad[oa]s?\\b",
  "\\bgracias\\b",
  "\\barigatou?\\b",
  "ありがとう",
  HEART_EMOJI_CLASS,
  "<3+" // <3, <33 … but never </3
].join("|"), "iu")

export function detectGratitude(text) {
  return GRATITUDE_REGEX.test(String(text ?? ""))
}

// ── One burst per client_message_id ─────────────────────────────────────────

// The composer path marks the id on local send so the pending/log insert
// never double-fires; the log path (other users' messages) marks on burst.
// Key space is the message DOM id suffix — `message_<client_message_id>` for
// both the optimistic template and the server-rendered message (to_key).
const burstClientMessageIds = new Set()

export function hasBurstMessage(clientMessageId) {
  return burstClientMessageIds.has(clientMessageId)
}

export function markBurstMessage(clientMessageId) {
  if (clientMessageId == null || clientMessageId === "") return

  burstClientMessageIds.add(clientMessageId)
}

// ── Burst engine (Desktop particle-field contract) ──────────────────────────

// Desktop DEFAULT_PARTICLE_CONFIG, verbatim.
export const BURST_CONFIG = {
  count: 12,
  spawnWindowMs: 550,
  size: [ 6, 13 ],
  rise: [ 6.75, 15.75 ], // % of field height, life-biased
  duration: [ 320, 700 ], // rise ms, life-biased so short-lived rise less
  swayAmp: [ 9, 24 ], // px each side of center
  bank: [ 7, 16 ], // peak tilt into the sway, deg
  swayDuration: [ 1300, 2800 ], // own clock, independent of the rise
  maxAlive: 200
}

const rand = ([ min, max ]) => min + Math.random() * (max - min)
// Sample a range along `t` (0→min, 1→max) — couples travel/lifetime to `life`.
const lerp = ([ min, max ], t) => min + (max - min) * t

// One particle's motion plan (Desktop spawn()). Pure: no DOM, node-testable.
export function spawnParticle(config = BURST_CONFIG, colors = [ HEART_COLOR ]) {
  // Short-lived particles fade out lower; a few live longer and rise higher.
  const life = Math.random() ** 1.7
  const swayDurationMs = Math.round(rand(config.swayDuration))

  return {
    // Spread edge to edge across the lane, not clustered near center.
    leftPct: 4 + Math.random() * 92,
    size: rand(config.size),
    color: colors[Math.floor(Math.random() * colors.length)],
    delayMs: Math.round(Math.random() * 120),
    durationMs: Math.round(lerp(config.duration, life)),
    rise: lerp(config.rise, life),
    swayAmp: rand(config.swayAmp),
    bank: rand(config.bank),
    swayDurationMs,
    // Negative delay drops each particle in mid-swing (desynced phases).
    swayDelayMs: -Math.round(Math.random() * swayDurationMs)
  }
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)

// anchor → { field, timers, anchored } so repeat bursts reuse the lane and
// cleanup restores exactly what we changed.
const bursts = new WeakMap()

function createParticleElement(particle) {
  const particleElement = document.createElement("span")
  const style = particleElement.style

  particleElement.className = "heart-burst__particle"
  style.setProperty("--particle-left", `${particle.leftPct}%`)
  style.setProperty("--particle-size", `${particle.size}px`)
  style.setProperty("--particle-color", particle.color)
  style.setProperty("--particle-delay", `${particle.delayMs}ms`)
  style.setProperty("--particle-duration", `${particle.durationMs}ms`)
  style.setProperty("--particle-rise", particle.rise)
  style.setProperty("--particle-sway", `${particle.swayAmp}px`)
  style.setProperty("--particle-bank", `${particle.bank}deg`)
  style.setProperty("--particle-sway-duration", `${particle.swayDurationMs}ms`)
  style.setProperty("--particle-sway-delay", `${particle.swayDelayMs}ms`)

  particleElement.innerHTML = `<span class="heart-burst__sway"><span class="heart-burst__glyph">${buildHeartSVG()}</span></span>`

  return particleElement
}

function removeField(anchor, burst) {
  for (const timer of burst.timers) clearTimeout(timer)
  burst.timers.clear()
  burst.field.remove()
  bursts.delete(anchor)

  if (burst.anchored) anchor.classList.remove("heart-burst--anchored")
}

export function burstHearts(anchorEl) {
  if (!anchorEl || typeof document === "undefined") return

  let burst = bursts.get(anchorEl)

  if (!burst) {
    const field = document.createElement("div")

    field.className = "heart-burst"
    field.setAttribute("aria-hidden", "true")
    anchorEl.appendChild(field)

    // The lane positions against the anchor; static anchors get promoted so
    // the hearts rise from the anchor, not some further ancestor.
    let anchored = false
    if (getComputedStyle(anchorEl).position === "static") {
      anchorEl.classList.add("heart-burst--anchored")
      anchored = true
    }

    burst = { field, timers: new Set(), anchored }
    bursts.set(anchorEl, burst)
  }

  const add = () => {
    const particle = createParticleElement(spawnParticle())

    // Retire on the RISE/FLASH track only (sway is infinite, pop is shorter).
    particle.addEventListener("animationend", event => {
      if (event.animationName !== "heart-burst-rise" && event.animationName !== "heart-burst-flash") return

      particle.remove()

      if (burst.field.childElementCount === 0 && !burst.timers.size) {
        removeField(anchorEl, burst)
      }
    })

    // Cap simultaneously-alive particles (oldest retire first, like Desktop).
    while (burst.field.childElementCount >= BURST_CONFIG.maxAlive) {
      burst.field.firstElementChild.remove()
    }

    burst.field.appendChild(particle)
  }

  // Release the burst across a tight window so it reads as one poof, each
  // particle with its own random birth time; reduced motion gets one flash.
  if (prefersReducedMotion()) {
    add()

    return
  }

  for (let i = 0; i < BURST_CONFIG.count; i++) {
    const timer = setTimeout(() => {
      burst.timers.delete(timer)
      add()
    }, Math.random() * BURST_CONFIG.spawnWindowMs)

    burst.timers.add(timer)
  }
}
