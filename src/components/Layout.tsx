import { Link, NavLink, Outlet } from 'react-router-dom';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
  }`;

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="text-xl" aria-hidden>🧪</span>
            <span>AI Stock Lab</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navClass}>
              Leaderboard
            </NavLink>
            <NavLink to="/new" className={navClass}>
              <span className="hidden sm:inline">＋ New</span>
              <span className="sm:hidden">＋</span>
            </NavLink>
            <NavLink to="/settings" className={navClass}>
              Settings
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-600">
        Virtual portfolios for research only — not financial advice.
      </footer>
    </div>
  );
}
