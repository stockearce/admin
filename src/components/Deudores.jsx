import { useEffect, useState } from 'react';
import { getDeudores, registrarPagoDeudor, registrarDeudorManual } from '../api/pagosApi';

export default function Deudores() {
  const [estado, setEstado] = useState('pendiente');
  const [lista, setLista] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [form, setForm] = useState({ monto: '', caja: 'efectivo', notas: '' });
  const [msg, setMsg] = useState(null);

  // NUEVO: estado para registrar deudor manual
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [formNuevo, setFormNuevo] = useState({ venta_id: '', notas: '' });
  const [msgNuevo, setMsgNuevo] = useState(null);
  const [cargandoNuevo, setCargandoNuevo] = useState(false);

  const fmt = (n) => '$' + parseFloat(n).toLocaleString('es-AR', { minimumFractionDigits: 2 });

  const cargar = async (est) => {
    setEstado(est);
    setSeleccionado(null);
    const d = await getDeudores(est);
    setLista(d.success ? d.deudores : []);
  };

  useEffect(() => { cargar('pendiente'); }, []);

  const pagar = async () => {
    if (!form.monto || parseFloat(form.monto) <= 0) {
      setMsg({ tipo: 'error', texto: 'Ingresá un monto válido.' }); return;
    }
    const d = await registrarPagoDeudor({
      deudor_id: seleccionado.id,
      monto: parseFloat(form.monto),
      caja: form.caja,
      notas: form.notas,
    });
    if (d.success) {
      setMsg({ tipo: 'success', texto: `Pago registrado. Pendiente: ${fmt(d.monto_pendiente)}` });
      setTimeout(() => { setSeleccionado(null); cargar('pendiente'); }, 1500);
    } else {
      setMsg({ tipo: 'error', texto: d.error });
    }
  };

  // NUEVO: registrar deudor manual
  const registrarNuevo = async () => {
    if (!formNuevo.venta_id) {
      setMsgNuevo({ tipo: 'error', texto: 'Ingresá el ID de la venta.' }); return;
    }
    setCargandoNuevo(true);
    const d = await registrarDeudorManual({
      venta_id: parseInt(formNuevo.venta_id),
      notas: formNuevo.notas,
    });
    setCargandoNuevo(false);
    if (d.success) {
      setMsgNuevo({ tipo: 'success', texto: d.mensaje });
      setFormNuevo({ venta_id: '', notas: '' });
      setTimeout(() => {
        setMostrarFormNuevo(false);
        setMsgNuevo(null);
        cargar('pendiente');
      }, 1500);
    } else {
      setMsgNuevo({ tipo: 'error', texto: d.error });
    }
  };

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Deudores</h3>
          <button className="btn primary" onClick={() => { setMostrarFormNuevo(v => !v); setMsgNuevo(null); }}>
            {mostrarFormNuevo ? 'Cancelar' : '+ Nuevo deudor'}
          </button>
        </div>

        <div className="btn-row" style={{ marginBottom: '1rem' }}>
          {['pendiente', 'parcial', 'pagado'].map(e => (
            <button key={e} className={`btn ${estado === e ? 'active' : ''}`} onClick={() => cargar(e)}>
              {e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>

        {lista.length === 0
          ? <p className="muted">No hay deudores con estado "{estado}".</p>
          : lista.map(d => (
            <div key={d.id} className="list-item">
              <div>
                <div style={{ fontWeight: 500 }}>{d.cliente}</div>
                <div className="muted" style={{ fontSize: 12 }}>Venta #{d.venta_id} — {d.fecha_venta}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 500, color: '#e24b4a' }}>{fmt(d.monto_pendiente)}</div>
                  <div className="muted" style={{ fontSize: 11 }}>de {fmt(d.monto_original)}</div>
                </div>
                <button className="btn" onClick={() => { setSeleccionado(d); setForm({ monto: '', caja: 'efectivo', notas: '' }); setMsg(null); }}>
                  Pagar
                </button>
              </div>
            </div>
          ))
        }
      </div>

      {/* NUEVO: Formulario registrar deudor manual */}
      {mostrarFormNuevo && (
        <div className="card">
          <h3>Registrar nuevo deudor</h3>
          <div className="row">
            <label>ID de venta</label>
            <input
              type="number"
              value={formNuevo.venta_id}
              onChange={e => setFormNuevo(f => ({ ...f, venta_id: e.target.value }))}
              placeholder="Ej: 123"
            />
          </div>
          <div className="row">
            <label>Notas</label>
            <input
              type="text"
              value={formNuevo.notas}
              onChange={e => setFormNuevo(f => ({ ...f, notas: e.target.value }))}
              placeholder="Opcional"
            />
          </div>
          <div className="btn-row">
            <button className="btn primary" onClick={registrarNuevo} disabled={cargandoNuevo}>
              {cargandoNuevo ? 'Registrando...' : '✓ Registrar deudor'}
            </button>
          </div>
          {msgNuevo && <div className={`msg ${msgNuevo.tipo}`}>{msgNuevo.texto}</div>}
        </div>
      )}

      {/* Formulario pago existente */}
      {seleccionado && (
        <div className="card">
          <h3>Registrar pago — {seleccionado.cliente}</h3>
          <div className="row"><label>Pendiente</label><span style={{ color: '#e24b4a', fontWeight: 500 }}>{fmt(seleccionado.monto_pendiente)}</span></div>
          <div className="row"><label>Monto</label><input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="0.00" /></div>
          <div className="row"><label>Caja</label>
            <select value={form.caja} onChange={e => setForm(f => ({ ...f, caja: e.target.value }))}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>
          <div className="row"><label>Notas</label><input type="text" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Opcional" /></div>
          <div className="btn-row">
            <button className="btn primary" onClick={pagar}>✓ Confirmar pago</button>
            <button className="btn" onClick={() => setSeleccionado(null)}>Cancelar</button>
          </div>
          {msg && <div className={`msg ${msg.tipo}`}>{msg.texto}</div>}
        </div>
      )}
    </div>
  );
}