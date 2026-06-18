# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **How releases work:** the section matching the released tag (e.g. `## [2.2.0]`)
> is automatically lifted to the top of the GitHub Release notes by
> `.github/workflows/release.yml`. Keep this file up to date before tagging.

## [Unreleased]

## [2.2.0] - 2026-06-18

### Added
- New **modern** HTML ticket transcript design — a minimal, MSK-branded layout
  (lighter palette, clean meta cards, fully self-contained / offline-safe).
- New config option `transcriptDesign` to choose the transcript style:
  `"modern"` (default) or `"classic"` (the previous Discord-style layout).

### Changed
- Transcripts are now generated in the **modern** design by default — including
  existing servers without a `transcriptDesign` key. Set
  `"transcriptDesign": "classic"` to keep the old look.

## [2.1.0] - 2026-06-07

### Added
- **Predefined ticket priority per type** — new optional `ticketTypes[].priority`
  field (`"low"` / `"medium"` / `"high"` / `"urgent"`). New tickets of that type
  open with the configured priority (validated, falls back to `"medium"`),
  reflected in the opening embed and channel topic.
- **Ticket reopen** — new `reopenOption` config block
  (`enabled`, `button`, `whoCanReopen`: `EVERYONE` / `STAFFONLY`). Closed tickets
  show a "♻️ Reopen" button next to Delete, plus a `/reopen` slash command. Reopening
  restores the creator's channel access, resets the ticket to `open`, moves it back
  to its type category, strips the `closed-` name prefix and posts a reopened embed.

### Changed
- Both features degrade gracefully: without the new config keys the bot behaves as
  before (reopen stays disabled, priority defaults to `"medium"`).
