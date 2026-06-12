import { useState } from 'react';
import { registrarMovimientoExtra, getDetalleCierre } from '../api/pagosApi';

export default function Movimientos() {
  const hoy = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ fecha: hoy, tipo: 'gasto', caja: 'efectivo', monto: '', descripcion: '', categoria: 'Otros' });
  const [msg, setMsg] = useState(null);
  const [fechaConsulta, setFechaConsulta] = useState(hoy);
  const [movimientos, setMovimientos] = useState([]);

  const fmt = (n) => '$' + parseFloat(n).toLocaleString('es-AR', { minimumFractionDigits: 2 });

  const registrar = async () => {
    if (!form.monto || parseFloat(form.monto) <= 0) {
      setMsg({ tipo: 'error', texto: 'Ingresá un monto válido.' }); return;
    }
    const d = await registrarMovimientoExtra({ ...form, monto: parseFloat(form.monto) });
    if (d.success) {
      setMsg({ tipo: 'success', texto: `${d.mensaje} — ${fmt(d.monto)} en ${d.caja}` });
      setForm(f => ({ ...f, monto: '', descripcion: '' }));
    } else {
      setMsg({ tipo: 'error', texto: d.error });
    }
  };

  const consultar = async () => {
    const d = await getDetalleCierre(fechaConsulta);
    setMovimientos(d.success ? (d.movimientos_extra || []) : []);
  };

  return (
    <div className="two-col">
      <div className="card">
        <h3>Registrar movimiento</h3>
        <div className="row"><label>Fecha</label><input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></div>
        <div className="row"><label>Tipo</label>
          <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
            <option value="gasto">Gasto</option>
            <option value="ingreso_extra">Ingreso extra</option>
          </select>
        </div>
        <div className="row"><label>Caja</label>
          <select value={form.caja} onChange={e => setForm(f => ({ ...f, caja: e.target.value }))}>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
          </select>
        </div>
        <div className="row"><label>Monto</label><input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="0.00" /></div>
        <div className="row"><label>Descripción</label><input type="text" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: combustible" /></div>
        <div className="row"><label>Categoría</label>
          <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
            {['Combustible','Sueldos','Servicios','Compras','Otros'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="btn-row">
          <button className="btn primary" onClick={registrar}>+ Registrar</button>
        </div>
        {msg && <div className={`msg ${msg.tipo}`}>{msg.texto}</div>}
      </div>

      <div className="card">
        <h3>Movimientos del día</h3>
        <div className="row">
          <label>Fecha</label>
          <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} />
        </div>
        <button className="btn" onClick={consultar} style={{ marginBottom: '1rem' }}>Buscar</button>
        {movimientos.length === 0
          ? <p className="muted">Sin movimientos para esa fecha.</p>
          : movimientos.map(m => (
            <div key={m.id} className="list-item">
              <span>
                <span className={`badge ${m.tipo === 'gasto' ? 'red' : 'green'}`}>
                  {m.tipo === 'gasto' ? 'Gasto' : 'Ingreso'}
                </span>
                <span style={{ marginLeft: 8 }}>{m.descripcion || m.categoria}</span>
              </span>
              <span>{fmt(m.monto)} <small className="muted">{m.caja}</small></span>
            </div>
          ))
        }
      </div>
    </div>
  );
}