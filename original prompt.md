You are orchestrating multiple AI batches to build the MVP of a web-based, mobile-friendly game called “Wall Street Fantasy League”, hosted on Google Firebase.

Your objective is to break the project into clear, independent batches that can be developed in parallel, with well-defined responsibilities and handoff points.

GLOBAL CONSTRAINTS

The product is an MVP only.
No real money, no trading execution, no leverage, no short selling.
Use end-of-day stock prices only.
Use Google Firebase for authentication, database, backend logic, and hosting.
All game logic and scoring must be enforced server-side.
The frontend must be mobile-first and web-based.

BATCH 1 — PRODUCT & GAME LOGIC

Responsibilities:
Define the complete game rules and enforceable constraints.
Define match lifecycle states and transitions.
Define scoring logic, ranking rules, and tie-breakers.
Define validation rules for portfolios.
Define edge cases such as missing price data, market holidays, and late joins.

Deliverables:
Written game rules and logic specification.
Match lifecycle description.
Scoring and ranking logic description.
Validation and error handling rules.

BATCH 2 — DATA MODEL & FIREBASE SCHEMA

Responsibilities:
Design the Firestore data model.
Define collections, documents, and relationships.
Define required fields and indexes.
Design immutable data patterns for price snapshots and results.
Ensure the schema supports leaderboard queries efficiently.

Deliverables:
Firestore schema description.
Entity relationships explanation.
Index and query strategy.
Data immutability guidelines.

BATCH 3 — AUTHENTICATION & SECURITY

Responsibilities:
Define authentication flows using Firebase Authentication.
Design Firestore security rules conceptually (no code).
Define user permissions and access boundaries.
Prevent duplicate portfolios per user per match.
Define anti-cheat and integrity protections.

Deliverables:
Authentication flow description.
Access control matrix.
Security rules logic description.
Integrity safeguards list.

BATCH 4 — BACKEND LOGIC & CLOUD FUNCTIONS

Responsibilities:
Define backend responsibilities for match creation, joining, locking, starting, and finishing.
Design price snapshot workflow at match start and end.
Design settlement and scoring workflow.
Define Cloud Scheduler triggers and timing logic.
Define retry and failure handling for external price APIs.

Deliverables:
Backend logic flow descriptions.
Cloud Function responsibilities list.
Scheduler and timing strategy.
Failure and retry handling strategy.

BATCH 5 — FRONTEND UX & SCREEN FLOW

Responsibilities:
Design mobile-first screen flows.
Define user journey from login to match result.
Define UI components for portfolio building and leaderboards.
Define UX safeguards for locking portfolios.
Ensure clarity and simplicity for first-time users.

Deliverables:
Screen list and navigation flow.
Key UI components description.
UX rules and constraints.
Empty, loading, and error state definitions.

BATCH 6 — MARKET DATA INTEGRATION

Responsibilities:
Define requirements for stock market data.
Define symbol search behavior and validation.
Define price normalization rules (currency and timezone).
Define how to handle missing, delayed, or invalid prices.
Ensure consistency across all matches.

Deliverables:
Market data requirements specification.
Symbol validation rules.
Price normalization and timing rules.
Fallback and error-handling policies.

BATCH 7 — QA, EDGE CASES & MVP POLISH

Responsibilities:
Identify edge cases across the system.
Define test scenarios for core gameplay.
Define acceptance criteria for MVP launch.
Identify potential abuse or exploit scenarios.
Ensure performance and cost constraints are respected.

Deliverables:
Edge case list.
Test scenarios and acceptance criteria.
Exploit and abuse prevention checklist.
MVP readiness checklist.

FINAL OUTPUT EXPECTATION

Each batch must produce clear, implementation-ready documentation in plain text.
No code is required at this stage.
All outputs must align and be consistent across batches.
The combined output should allow a development team to implement the MVP without ambiguity.
