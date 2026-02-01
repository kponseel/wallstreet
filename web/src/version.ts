export const APP_VERSION = '2.0.1';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: 'added' | 'changed' | 'fixed' | 'removed';
    description: string;
  }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.0.1',
    date: '2026-02-01',
    changes: [
      { type: 'fixed', description: 'CI/CD deployment now auto-cleans orphaned Cloud Functions' },
      { type: 'removed', description: 'Legacy v1.0 admin and price snapshot functions' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-01-29',
    changes: [
      { type: 'added', description: 'Initial release of Wall Street Fantasy League' },
      { type: 'added', description: 'User authentication with Email/Password and Google Sign-In' },
      { type: 'added', description: 'Create public and private matches' },
      { type: 'added', description: 'Join matches via lobby or invite code' },
      { type: 'added', description: 'Portfolio builder with 5-stock allocation (5-50% per position)' },
      { type: 'added', description: 'Match lobby to browse open matches' },
      { type: 'added', description: 'Match detail page with leaderboard' },
      { type: 'added', description: 'User profile with stats' },
      { type: 'added', description: 'Mobile-friendly responsive design' },
    ],
  },
];
