# INDIWABOLA Firestore Security Specification

## 1. Data Invariants
1. **Identity Integrity**: Every document under `/players/{playerId}` and `/players/{playerId}/scores/{scoreId}` must match `request.auth.uid == playerId` and `incoming().uid == request.auth.uid`.
2. **PII Isolation**: User email addresses live exclusively inside `/players/{playerId}/private/{docId}` (`PlayerPrivate`) and are never stored in `/players/{playerId}` (`PlayerPublic`) or `/players/{playerId}/scores/{scoreId}`. Only the owner with `email_verified == true` may read or write `PlayerPrivate`.
3. **Public Standings Visibility**: `/players/{playerId}` contains only non-PII game stats (`username`, `favoriteClub`, `country`, `totalPoints`, `skillPoints`, `multiplayerPoints`, `streak`, `gamesPlayed`) and sets `isPublic == true`.
4. **Immutable Score History**: `/players/{playerId}/scores/{scoreId}` entries are append-only (`allow update, delete: if false`) with bounded score (`0 <= score <= 2250`), valid `gameId`, and `createdAt == request.time`.
5. **Temporal Integrity & Path Safety**: All document IDs are validated via `isValidId()`, all strings enforce explicit `.size()` limits, and `createdAt`/`updatedAt` strictly require `request.time`.

## 2. Dirty Dozen Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Write**: Create `/players/attacker1` without `request.auth`.
2. **Spoofed UID**: Authenticated user `uidA` creates `/players/uidA` with `{ uid: "uidB" }`.
3. **Ghost Shadow Field**: Authenticated user creates `/players/uidA` with extra `{ isAdmin: true }`.
4. **PII Leak Attempt**: Authenticated user `uidB` reads `/players/uidA/private/info`.
5. **Unverified Email Write**: User with `email_verified == false` attempts write to `/players/uidA`.
6. **Out-of-Bounds Score**: User writes score entry with `{ score: 999999 }`.
7. **Invalid Game ID**: User writes score entry with `{ gameId: "hacked-game" }`.
8. **Score Tampering (Update)**: User tries to update an existing `/players/uidA/scores/s1` score.
9. **Client Timestamp Forgery**: User submits `{ createdAt: "2020-01-01T00:00:00Z" }` instead of `request.time`.
10. **Immutable Field Mutation**: User updates `uid` or `createdAt` on `/players/uidA`.
11. **ID Poisoning**: User creates document at `/players/a..b..$invalid` or 500-char ID.
12. **Blanket Private List Scrape**: User `uidB` attempts `list` on `/players/uidA/private`.
