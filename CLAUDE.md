# CLAUDE.md - Wall Street Fantasy League

This document provides comprehensive guidance for AI assistants working with the Wall Street Fantasy League (WSFL) codebase.

## Project Overview

Wall Street Fantasy League is a stock-picking competition game where players build virtual portfolios (3 stocks, 10,000 credits) and compete based on percentage returns over 7 days. Built as a full-stack application with Firebase backend and React frontend.

**Current Version**: 2.0

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript 5 + Vite 5 + Tailwind CSS + Zustand |
| Backend | Firebase Cloud Functions (Node.js 22) + Firestore |
| Auth | Firebase Authentication (email/Google) |
| Hosting | Firebase Hosting |
| CI/CD | GitHub Actions |

## Project Structure

```
wallstreet/
├── web/                          # React frontend
│   ├── src/
│   │   ├── pages/               # Route pages (Home, Login, MatchLobby, etc.)
│   │   ├── components/          # Reusable components (Layout, LoadingScreen)
│   │   ├── hooks/               # Custom hooks (useAuthStore)
│   │   ├── services/            # External services (firebase.ts)
│   │   ├── types/               # TypeScript definitions
│   │   ├── App.tsx              # Main router
│   │   └── main.tsx             # Entry point
│   ├── tailwind.config.js
│   └── vite.config.ts
├── functions/                    # Firebase Cloud Functions
│   └── src/
│       ├── game/                # Game management (create, join, launch)
│       ├── portfolio/           # Portfolio submission and validation
│       ├── settlement/          # Game settlement and awards
│       ├── auth/                # User authentication triggers
│       ├── data/                # Stock data (NASDAQ, CAC40)
│       ├── utils/               # Helpers (dates, calculations)
│       ├── index.ts             # Function exports
│       └── types.ts             # Backend types
├── firebase.json                 # Firebase configuration
├── firestore.rules              # Security rules
├── firestore.indexes.json       # Database indexes
└── batch*_*.txt                 # Specification documents
```

## Quick Commands

```bash
# Development
npm run dev                    # Start frontend (Vite dev server)
npm run emulators             # Start Firebase emulators
npm run emulators:dev         # Emulators with persistent data

# Building
npm run build                 # Build everything
npm run build:web             # Build frontend only
npm run build:functions       # Build backend only

# Testing
npm run test                  # Run all tests
npm run test:web              # Frontend tests (Vitest)
npm run test:functions        # Backend tests (Jest)

# Deployment
firebase deploy               # Deploy everything
firebase deploy --only functions
firebase deploy --only hosting
```

## Deployment Notes

### Orphaned Functions in Production
The following functions exist in Firebase but were removed from the codebase (legacy v1.0 functions). Deployment will fail in non-interactive mode until these are manually deleted:

```bash
# Admin functions (removed)
firebase functions:delete adminDeleteGame --region us-central1
firebase functions:delete adminDeletePlayer --region us-central1
firebase functions:delete adminListGames --region us-central1
firebase functions:delete adminListPlayers --region us-central1

# Price snapshot functions (removed - prices now handled differently)
firebase functions:delete dailyPriceSnapshot --region us-central1
firebase functions:delete getBatchStockPrices --region us-central1
firebase functions:delete getPriceSnapshot --region us-central1
firebase functions:delete getStockPrice --region us-central1
firebase functions:delete storePriceSnapshot --region us-central1
```

### CI/CD Pipeline
- Deploys automatically on push to `main` or `claude/*` branches
- Uses GitHub Actions (`.github/workflows/firebase-deploy.yml`)
- Requires Firebase secrets configured in GitHub repository settings

## Key Business Rules

### Game Mechanics
- **Portfolio**: Exactly 3 stocks, total budget 10,000 credits
- **Duration**: 7 days from launch (ends at 22:30 Paris time)
- **Markets**: NASDAQ and CAC40 stocks only
- **Scoring**: Weighted average of individual position returns

### Game Lifecycle
1. **DRAFT** - Players join and submit portfolios
2. **LIVE** - Game running, prices tracking (7 days)
3. **ENDED** - Results calculated, awards granted

### Awards
- **WOLF** - 1st place (highest return)
- **DOLPHIN** - 2nd place
- **INTERN** - Last place
- **ROCKET** - Best single stock (>50% return)
- **BAG_HOLDER** - Worst single stock (<-50% return)
- **ORACLE** - All 3 stocks in green
- **GAMBLER** - >8,000 credits on one stock

## Code Conventions

### Naming
- Game codes: `WS-XXXX` format (e.g., WS-8821)
- Player IDs: 8-character alphanumeric
- Functions: camelCase, verb-first (`submitPortfolio`, `createGame`)
- Components: PascalCase (`PortfolioBuilder`, `MatchLobby`)
- Constants: UPPER_SNAKE_CASE

### TypeScript
- Strict mode enabled everywhere
- Types exported from `types/index.ts` (frontend) and `types.ts` (backend)
- Interfaces preferred over type aliases for objects

### Firebase Patterns
- All writes go through Cloud Functions (Firestore rules restrict client writes)
- Use batch operations for atomic multi-document writes
- Use transactions for operations requiring read-then-write consistency
- Callable functions format: `functions.https.onCall()`
- Error handling: throw `HttpsError` with appropriate codes

### React Patterns
- Zustand for state management (`useAuthStore`)
- Protected routes wrap authenticated pages
- Services abstracted in `/services` directory
- Tailwind CSS for styling (no CSS modules)

## API Response Format

All Cloud Functions return:
```typescript
{
  success: boolean,
  data?: T,
  error?: { code: string, message: string }
}
```

Error codes: `unauthenticated`, `invalid-argument`, `not-found`, `permission-denied`, `failed-precondition`, `already-exists`, `internal`

## Database Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | User profiles | uid, email, displayName, stats |
| `games` | Game instances | code, status, playerCount, startDate, endDate |
| `players` | Game participants | playerId, gameCode, portfolio, isReady |
| `results` | Final results | gameCode, playerId, portfolioReturnPercent, rank, awards |
| `leaderboard` | Rankings | gameCode, rank, playerId, returnPercent |
| `priceSnapshots` | Stock prices | ticker, date, closePrice |

## Security Model

- **Read**: Authenticated users can read games, players, results, leaderboard
- **Write**: All writes restricted to Cloud Functions
- **User data**: Users can only read/update their own profile
- **Game operations**: Creator-only actions (launch, update, cancel, force settle)

## Environment Variables

### Web (`web/.env`)
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_USE_EMULATORS=true  # For local development
```

### Functions (`functions/.env`)
```
FIRESTORE_EMULATOR_HOST  # For local testing
```

## Emulator Ports

| Service | Port |
|---------|------|
| Auth | 9099 |
| Functions | 5001 |
| Firestore | 8080 |
| Hosting | 5000 |
| Pub/Sub | 8085 |
| Emulator UI | 4000 |

## Important Implementation Details

### Timezone Handling
- All game timing uses Paris timezone (Europe/Paris)
- End time is always 22:30 Paris time
- Trading day calculations account for market holidays (US and French)

### Price Freezing
- Initial prices captured at game launch (J-1 close prices)
- Quantities calculated: `budgetInvested / initialPrice`
- Final prices fetched at settlement

### Settlement Process
- Scheduled function runs every 15 minutes
- Finds LIVE games past end date
- Calculates final values and returns
- Determines rankings and awards
- Idempotent (safe to run multiple times)

## Key Files Reference

### Frontend
- `web/src/App.tsx` - Router and route definitions
- `web/src/types/index.ts` - All shared types
- `web/src/hooks/useAuthStore.ts` - Authentication state
- `web/src/pages/PortfolioBuilder.tsx` - Portfolio submission UI

### Backend
- `functions/src/index.ts` - All function exports
- `functions/src/game/index.ts` - Game CRUD operations
- `functions/src/portfolio/index.ts` - Portfolio validation and submission
- `functions/src/settlement/index.ts` - Settlement and award logic
- `functions/src/utils/helpers.ts` - Utility functions

### Configuration
- `firebase.json` - Firebase services config
- `firestore.rules` - Database security rules
- `firestore.indexes.json` - Query indexes
- `.github/workflows/firebase-deploy.yml` - CI/CD pipeline

## Common Tasks

### Adding a New Cloud Function
1. Create function in appropriate module (`game/`, `portfolio/`, etc.)
2. Export from `functions/src/index.ts`
3. Deploy with `firebase deploy --only functions`

### Adding a New Page
1. Create component in `web/src/pages/`
2. Add route in `web/src/App.tsx`
3. Use `ProtectedRoute` wrapper if authentication required

### Modifying Game Rules
1. Update constants in `types/index.ts` (`TOTAL_BUDGET`, `REQUIRED_POSITIONS`)
2. Update validation in `functions/src/portfolio/index.ts`
3. Update settlement logic in `functions/src/settlement/index.ts`

### Adding Stock Markets
1. Add stock list in `functions/src/data/stocks.ts`
2. Update `ELIGIBLE_TICKERS` and `searchSymbols` function
3. Consider market holiday handling in `utils/helpers.ts`

## Testing Recommendations

- Test game lifecycle: create -> join -> submit portfolio -> launch -> settle
- Test portfolio validation edge cases (budget limits, duplicate stocks)
- Test timezone calculations for different DST scenarios
- Test award calculations for all award types
- Test settlement idempotency
- Test anonymous vs authenticated player flows

## Documentation Reference

Detailed specifications in batch files:
- `batch1_*.txt` - Game rules and lifecycle
- `batch2_*.txt` - Data models and schema
- `batch3_*.txt` - Security and authentication
- `batch4_*.txt` - Backend functions and workflows
- `batch5_*.txt` - Frontend components and UX
- `batch6_*.txt` - Data quality and pricing
- `batch7_*.txt` - Testing matrix and readiness
