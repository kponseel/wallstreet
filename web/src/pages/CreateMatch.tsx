import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase';
import { GAME_CONSTANTS } from '@/types';

export function CreateMatchPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const createGame = httpsCallable(functions, 'createGame');
      const result = await createGame({ name, nickname });

      const data = result.data as { success: boolean; data?: { gameCode: string; playerId: string } };
      if (data.success && data.data?.gameCode) {
        // Store playerId in localStorage for this game
        if (data.data.playerId) {
          localStorage.setItem(`player_${data.data.gameCode}`, data.data.playerId);
        }
        setGameCode(data.data.gameCode);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (gameCode) {
      await navigator.clipboard.writeText(gameCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const goToGame = () => {
    if (gameCode) {
      navigate(`/games/${gameCode}`);
    }
  };

  // Game created successfully - show code sharing UI
  if (gameCode) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Partie Creee !</h2>

        <div className="card p-6 space-y-6">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Partage ce code avec tes amis :</p>

            <div className="bg-gray-100 rounded-xl p-6 mb-4">
              <div className="text-4xl font-bold font-mono tracking-wider text-primary-600">
                {gameCode}
              </div>
            </div>

            <button
              onClick={copyCode}
              className="btn-secondary mb-4"
            >
              {copied ? 'Copie !' : 'Copier le code'}
            </button>

            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm">
              <p className="font-medium mb-2">Regles du jeu :</p>
              <ul className="text-left space-y-1">
                <li>Chaque joueur choisit {GAME_CONSTANTS.REQUIRED_POSITIONS} actions (NASDAQ ou CAC40)</li>
                <li>Budget: {GAME_CONSTANTS.TOTAL_BUDGET.toLocaleString()} Credits</li>
                <li>Duree: {GAME_CONSTANTS.DURATION_DAYS} jours</li>
                <li>Le gagnant est celui avec le meilleur rendement %</li>
              </ul>
            </div>
          </div>

          <button
            onClick={goToGame}
            className="btn-primary w-full"
          >
            Acceder a la partie
          </button>
        </div>
      </div>
    );
  }

  // Initial form to create game
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Creer une Partie</h2>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom de la partie
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="ex: Duel du Vendredi, Challenge CAC40..."
            minLength={3}
            maxLength={50}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ton pseudo
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="input"
            placeholder="ex: Le Loup, Warren B., ..."
            minLength={2}
            maxLength={20}
            required
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
          <p className="font-medium mb-2">Comment ca marche :</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Tu crees la partie et recois un code unique</li>
            <li>Tu partages le code avec tes amis</li>
            <li>Chacun compose son portefeuille de 3 actions</li>
            <li>Tu lances la partie quand tout le monde est pret</li>
            <li>Apres 7 jours, le classement final est revele !</li>
          </ol>
        </div>

        <button
          type="submit"
          disabled={loading || name.length < 3 || nickname.length < 2}
          className="btn-primary w-full"
        >
          {loading ? 'Creation...' : 'Creer la partie'}
        </button>
      </form>
    </div>
  );
}
