import { useParams, Link } from 'react-router-dom';

export function MatchDetailPage() {
  const { matchId } = useParams();

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Match Details</h2>
        <p className="text-gray-600 mb-4">Match ID: {matchId}</p>
        <p className="text-gray-500 text-sm">
          Full match details and leaderboard will be displayed here.
        </p>
      </div>

      <Link to={`/matches/${matchId}/portfolio`} className="btn-primary w-full block text-center">
        Build Portfolio
      </Link>
    </div>
  );
}
