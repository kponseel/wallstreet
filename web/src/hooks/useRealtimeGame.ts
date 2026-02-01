import { useState, useEffect } from 'react';
import {
  doc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import type { Game } from '@/types';

interface PlayerInfo {
  playerId: string;
  nickname: string;
  isReady: boolean;
  joinedAt: string;
  portfolioCount?: number;
  portfolio?: Array<{
    ticker: string;
    budgetInvested: number;
    quantity: number;
    initialPrice: number;
  }>;
}

interface UseGameListenerResult {
  game: Game | null;
  loading: boolean;
  error: string | null;
}

interface UsePlayersListenerResult {
  players: PlayerInfo[];
  loading: boolean;
  error: string | null;
}

interface GameChangeEvent {
  type: 'status_changed' | 'player_joined' | 'player_left' | 'player_ready' | 'game_updated';
  data?: Record<string, unknown>;
}

/**
 * Real-time listener for a game document
 */
export function useGameListener(
  gameCode: string | undefined,
  onGameChange?: (event: GameChangeEvent) => void
): UseGameListenerResult {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!gameCode) {
      setLoading(false);
      return;
    }

    const gameRef = doc(db, 'games', gameCode);

    const unsubscribe = onSnapshot(
      gameRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as DocumentData;
          const gameData: Game = {
            code: data.code,
            name: data.name,
            creatorId: data.creatorId,
            creatorDisplayName: data.creatorDisplayName,
            creatorPlayerId: data.creatorPlayerId || null,
            status: data.status,
            playerCount: data.playerCount,
            maxPlayers: data.maxPlayers,
            tickers: data.tickers || [],
            initialPricesSnapshot: data.initialPricesSnapshot || null,
            dataQualityFlag: data.dataQualityFlag || 'OK',
            startDate: data.startDate?.toDate() || null,
            endDate: data.endDate?.toDate() || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            launchedAt: data.launchedAt?.toDate() || null,
            endedAt: data.endedAt?.toDate() || null,
          };

          // Detect status change
          if (previousStatus && previousStatus !== gameData.status && onGameChange) {
            onGameChange({
              type: 'status_changed',
              data: { from: previousStatus, to: gameData.status },
            });
          }

          setPreviousStatus(gameData.status);
          setGame(gameData);
        } else {
          setGame(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Game listener error:', err);
        setError('Erreur de connexion');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [gameCode, onGameChange, previousStatus]);

  return { game, loading, error };
}

/**
 * Real-time listener for players in a game
 */
export function usePlayersListener(
  gameCode: string | undefined,
  onPlayerChange?: (event: GameChangeEvent) => void
): UsePlayersListenerResult {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousPlayerIds, setPreviousPlayerIds] = useState<Set<string>>(new Set());
  const [previousReadyStates, setPreviousReadyStates] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (!gameCode) {
      setLoading(false);
      return;
    }

    const playersQuery = query(
      collection(db, 'players'),
      where('gameCode', '==', gameCode),
      orderBy('joinedAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      playersQuery,
      (snapshot) => {
        const playersList: PlayerInfo[] = [];
        const currentPlayerIds = new Set<string>();
        const currentReadyStates = new Map<string, boolean>();

        snapshot.forEach((doc) => {
          const data = doc.data();
          const player: PlayerInfo = {
            playerId: data.playerId,
            nickname: data.nickname,
            isReady: data.isReady,
            joinedAt: data.joinedAt?.toDate().toISOString() || new Date().toISOString(),
            portfolioCount: data.portfolio?.length || 0,
            portfolio: data.portfolio || undefined,
          };
          playersList.push(player);
          currentPlayerIds.add(data.playerId);
          currentReadyStates.set(data.playerId, data.isReady);
        });

        // Detect player changes
        if (onPlayerChange && previousPlayerIds.size > 0) {
          // New players joined
          currentPlayerIds.forEach((id) => {
            if (!previousPlayerIds.has(id)) {
              const newPlayer = playersList.find((p) => p.playerId === id);
              onPlayerChange({
                type: 'player_joined',
                data: { nickname: newPlayer?.nickname },
              });
            }
          });

          // Players left
          previousPlayerIds.forEach((id) => {
            if (!currentPlayerIds.has(id)) {
              onPlayerChange({ type: 'player_left' });
            }
          });

          // Players became ready
          currentReadyStates.forEach((isReady, id) => {
            const wasReady = previousReadyStates.get(id);
            if (isReady && !wasReady) {
              const player = playersList.find((p) => p.playerId === id);
              onPlayerChange({
                type: 'player_ready',
                data: { nickname: player?.nickname },
              });
            }
          });
        }

        setPreviousPlayerIds(currentPlayerIds);
        setPreviousReadyStates(currentReadyStates);
        setPlayers(playersList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Players listener error:', err);
        setError('Erreur de connexion');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [gameCode, onPlayerChange, previousPlayerIds, previousReadyStates]);

  return { players, loading, error };
}

/**
 * Real-time listener for leaderboard entries during LIVE games
 */
export function useLeaderboardListener(
  gameCode: string | undefined,
  enabled: boolean = true
): { entries: Array<Record<string, unknown>>; loading: boolean } {
  const [entries, setEntries] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameCode || !enabled) {
      setLoading(false);
      return;
    }

    const leaderboardQuery = query(
      collection(db, 'leaderboard'),
      where('gameCode', '==', gameCode),
      orderBy('rank', 'asc')
    );

    const unsubscribe = onSnapshot(
      leaderboardQuery,
      (snapshot) => {
        const entriesList: Array<Record<string, unknown>> = [];
        snapshot.forEach((doc) => {
          entriesList.push(doc.data());
        });
        setEntries(entriesList);
        setLoading(false);
      },
      (err) => {
        console.error('Leaderboard listener error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [gameCode, enabled]);

  return { entries, loading };
}
