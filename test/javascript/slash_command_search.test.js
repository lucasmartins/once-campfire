import { test } from "node:test"
import assert from "node:assert/strict"

import {
  normalizeSlashQuery,
  rankSlashCommands,
  NAME_PREFIX_SCORE,
  NAME_SUBSTRING_SCORE,
  DESCRIPTION_SCORE
} from "../../app/javascript/lib/autocomplete/slash_command_search.js"

const COMMANDS = [
  { name: "help", description: "Show available slash commands", aliases: [] },
  { name: "status", description: "Show session status", aliases: [] },
  { name: "new", description: "Start a new session", aliases: [] },
  { name: "compact", description: "Compact the session context", aliases: [] },
  { name: "model", description: "Show or switch the active model", aliases: [] },
  { name: "approve", description: "Approve the pending action", aliases: [] },
  { name: "deny", description: "Deny the pending action", aliases: [] },
  { name: "kanban", description: "Board and profile workflow for the current project", aliases: [] }
]

function names(results) {
  return results.map((command) => command.name)
}

test("normalizeSlashQuery strips leading slashes, trims, and lower-cases", () => {
  assert.equal(normalizeSlashQuery("/kan"), "kan")
  assert.equal(normalizeSlashQuery("//Kan "), "kan")
  assert.equal(normalizeSlashQuery("  Profile"), "profile")
  assert.equal(normalizeSlashQuery(""), "")
  assert.equal(normalizeSlashQuery(null), "")
})

test('query "kan" finds kanban by name prefix', () => {
  const results = rankSlashCommands(COMMANDS, "kan")
  assert.deepEqual(names(results), ["kanban"])
})

test('query "profile" finds kanban via description', () => {
  const results = rankSlashCommands(COMMANDS, "profile")
  assert.deepEqual(names(results), ["kanban"])
})

test('query "/kan" matches the same as "kan"', () => {
  assert.deepEqual(
    names(rankSlashCommands(COMMANDS, "/kan")),
    names(rankSlashCommands(COMMANDS, "kan"))
  )
})

test('query "zzz" returns no matches', () => {
  assert.deepEqual(rankSlashCommands(COMMANDS, "zzz"), [])
})

test("empty query returns commands in original order", () => {
  assert.deepEqual(names(rankSlashCommands(COMMANDS, "")), names(COMMANDS))
  assert.deepEqual(names(rankSlashCommands(COMMANDS, "/")), names(COMMANDS))
  // Returns a copy, not the original array reference
  assert.notEqual(rankSlashCommands(COMMANDS, ""), COMMANDS)
})

test("name-prefix ranks above description-only hit", () => {
  const withDummy = [...COMMANDS, { name: "other", description: "kanban mentions", aliases: [] }]
  const results = rankSlashCommands(withDummy, "kan")
  assert.deepEqual(names(results), ["kanban", "other"])
})

test("score tiers: prefix > substring > description", () => {
  const commands = [
    { name: "other", description: "kanban mentions", aliases: [] },        // description hit
    { name: "ackan", description: "unrelated", aliases: [] },              // name substring
    { name: "kanban", description: "Board and profile workflow", aliases: [] } // name prefix
  ]
  const results = rankSlashCommands(commands, "kan")
  assert.deepEqual(names(results), ["kanban", "ackan", "other"])
  assert.equal(NAME_PREFIX_SCORE > NAME_SUBSTRING_SCORE, true)
  assert.equal(NAME_SUBSTRING_SCORE > DESCRIPTION_SCORE, true)
})

test("aliases are searchable like names", () => {
  // alias prefix hit
  const aliased = [{ name: "board", description: "unrelated", aliases: ["kb"] }]
  assert.deepEqual(names(rankSlashCommands(aliased, "kb")), ["board"])
  // alias substring hit (200) ranks below kanban's name prefix (300)
  const mixed = [
    { name: "board", description: "unrelated", aliases: ["mykan"] },
    { name: "kanban", description: "Board workflow", aliases: [] }
  ]
  assert.deepEqual(names(rankSlashCommands(mixed, "kan")), ["kanban", "board"])
})

test("name-prefix hit is not demoted by a description hit on another command", () => {
  const commands = [
    { name: "aaa", description: "everything kanban", aliases: [] },
    { name: "kanban", description: "Board workflow", aliases: [] }
  ]
  assert.deepEqual(names(rankSlashCommands(commands, "kan")), ["kanban", "aaa"])
})

test("ties sort by name ascending", () => {
  const commands = [
    { name: "zeta", description: "kan stuff", aliases: [] },
    { name: "alpha", description: "kan stuff", aliases: [] }
  ]
  assert.deepEqual(names(rankSlashCommands(commands, "kan")), ["alpha", "zeta"])
})
