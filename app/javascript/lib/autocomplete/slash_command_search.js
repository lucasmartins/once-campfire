// Pure search helpers for the slash command palette. Deliberately free of
// framework and importmap dependencies so node --test can import this file
// directly alongside the handler.

export const NAME_PREFIX_SCORE = 300
export const NAME_SUBSTRING_SCORE = 200
export const DESCRIPTION_SCORE = 100

// Strip leading slashes, trim, and lower-case so "/Kan " and "kan" match alike.
export function normalizeSlashQuery(query) {
  return String(query ?? "").replace(/^\/+/, "").trim().toLowerCase()
}

function searchableTerms(command) {
  return [command.name, ...(command.aliases || [])]
    .filter((term) => term !== undefined && term !== null && term !== "")
    .map((term) => String(term).toLowerCase())
}

function nameOrAliasScore(command, normalizedQuery) {
  const terms = searchableTerms(command)
  if (terms.some((term) => term.startsWith(normalizedQuery))) return NAME_PREFIX_SCORE
  if (terms.some((term) => term.includes(normalizedQuery))) return NAME_SUBSTRING_SCORE
  return 0
}

// Best tier wins: a name-prefix hit outranks a substring hit, which outranks a
// description hit. Description matches never lift a command above a stronger
// name/alias match.
function scoreCommand(command, normalizedQuery) {
  const description = String(command.description || "").toLowerCase()
  const descriptionHit = description.includes(normalizedQuery) ? DESCRIPTION_SCORE : 0
  return Math.max(nameOrAliasScore(command, normalizedQuery), descriptionHit)
}

export function rankSlashCommands(commands, query) {
  const list = Array.isArray(commands) ? commands : []
  const normalizedQuery = normalizeSlashQuery(query)

  if (!normalizedQuery) return [...list]

  return list
    .map((command) => ({ command, score: scoreCommand(command, normalizedQuery) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || String(a.command.name).localeCompare(String(b.command.name)))
    .map((entry) => entry.command)
}
