import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PortfolioForm from './pages/PortfolioForm';
import PortfolioDetail from './pages/PortfolioDetail';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<PortfolioForm />} />
        <Route path="/p/:id" element={<PortfolioDetail />} />
        <Route path="/p/:id/edit" element={<PortfolioForm />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}
