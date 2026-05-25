# 0002 — No hosted live demo yet

Status: accepted

## Context

A live demo would let people try Tournaments without cloning the repo. But Tournaments is single-user and file-backed: each judgment writes to a local JSON file, and the server has no concept of sessions or per-visitor isolation.

## Decision

Defer a hosted demo until a sandbox mode exists that can reset between visitors and prevent one visitor's state from leaking to the next.

## Consequences

- The README quick-start (`clone + install.sh + npm run start:sample`) is the only try-before-you-buy path.
- Screenshots and the README must do the work a live demo would otherwise do.
- No custom domain yet — a parked domain would signal more than the project currently offers.
