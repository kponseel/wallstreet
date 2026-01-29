import { Link } from 'react-router-dom';
import { APP_VERSION, CHANGELOG } from '@/version';

export function ChangelogPage() {
  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-100 text-green-700';
      case 'changed':
        return 'bg-blue-100 text-blue-700';
      case 'fixed':
        return 'bg-yellow-100 text-yellow-700';
      case 'removed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'added':
        return 'NEW';
      case 'changed':
        return 'MAJ';
      case 'fixed':
        return 'FIX';
      case 'removed':
        return 'DEL';
      default:
        return type.toUpperCase();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-primary-700">Changelog</h1>
          <span className="ml-auto text-sm text-gray-500">v{APP_VERSION}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {CHANGELOG.map((release) => (
          <div key={release.version} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Version {release.version}</h2>
              <span className="text-sm text-gray-500">{release.date}</span>
            </div>
            <ul className="space-y-2">
              {release.changes.map((change, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeStyle(change.type)}`}>
                    {getTypeLabel(change.type)}
                  </span>
                  <span className="text-gray-700">{change.description}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="text-center text-sm text-gray-500 py-4">
          Wall Street Fantasy League - Made with Claude Code
        </div>
      </main>
    </div>
  );
}
