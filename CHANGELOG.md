# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **How releases work:** the section matching the released tag (e.g. `## [2.2.0]`)
> is automatically lifted to the top of the GitHub Release notes by
> `.github/workflows/release.yml`. Keep this file up to date before tagging.

## [Unreleased]

## [2.2.2] - 2026-06-18

### Fixed
- **Transcript images no longer break over time.** Message image/file
  attachments were embedded using the raw Discord CDN URL, which is signed and
  expires ~24h after the transcript is generated — so every attachment image
  eventually turned into a broken-image icon. Attachments are now linked from the
  permanent copy stored on the MSK server via a relative path that resolves under
  both custom domains and the main site; the Discord URL is kept only as a
  fallback for files that weren't uploaded. (Avatars and emojis were never
  affected — they are embedded as Base64.)
- Unsupported attachment file types are now skipped instead of failing the whole
  transcript upload over a single file.

## [2.2.1] - 2026-06-18

### Fixed
- Transcript **"Closed on"** now shows the actual close time. It was empty
  because the transcript is generated before the close is written to the DB.
- **Custom Discord emojis** (`<:name:id>` / `<a:name:id>`) are now rendered —
  embedded as Base64 (offline-safe), with a `:name:` text fallback if the image
  can't be fetched. Previously they appeared as raw text.
- **Fenced code blocks** no longer start with an empty first line.

### Added
- Code blocks with a language fence show the language as a small label
  (e.g. `LUA`) — top-right of the block. No syntax colouring (kept
  dependency-free).
- Transcript header now shows **"Closed by"** and the **close reason**
  (the reason only appears when one was actually provided).

### Changed
- Header fields (**Created by** / **Claimed by** / **Closed by**) and in-message
  user mentions now show the member's **display name** instead of the raw user
  id. Names are resolved for free from the messages and only fetched from the
  guild for participants who never posted; unresolvable ids fall back to the id.

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
