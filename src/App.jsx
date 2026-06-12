import { useState } from 'react';
import Login from './pages/Login';

import Dashboard from './components/Dashboard';
import CierreDia from './components/CierreDia';
import Movimientos from './components/Movimientos';
import Deudores from './components/Deudores';
import HistorialCierres from './components/HistorialCierres';

import './App.css';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'cierre', label: 'Cierre del día' },
  { id: 'movimientos', label: 'Movimientos' },
  { id: 'deudores', label: 'Deudores' },
  { id: 'historial', label: 'Historial' },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [logueado, setLogueado] = useState(false);

  if (!logueado) {
    return (
      <Login
        onLogin={() => setLogueado(true)}
      />
    );
  }

  return (
    <div className="app">
      <nav className="nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="main">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'cierre' && <CierreDia />}
        {tab === 'movimientos' && <Movimientos />}
        {tab === 'deudores' && <Deudores />}
        {tab === 'historial' && <HistorialCierres />}
      </main>
    </div>
  );
}