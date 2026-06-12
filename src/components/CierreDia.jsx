// src/components/CierreDia.jsx - Versión con Modal integrado
// src/components/CierreDia.jsx
// src/components/CierreDia.jsx
import { useState } from 'react';
import { 
  procesarCierre, 
  getDetalleCierre, 
  registrarDeudorManual,
  registrarPagoDeudor,
  getDeudores 
} from '../api/pagosApi';

function ModalDeudor({ venta, onClose, onSuccess }) {
  const [deudorInfo, setDeudorInfo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [formPago, setFormPago] = useState({ monto: '', caja: 'efectivo', notas: '' });
  const [modo, setModo] = useState('verificar');

  const fmt = (n) => '$' + parseFloat(n).toLocaleString('es-AR', { minimumFractionDigits: 2 });

  const verificarDeudor = async () => {
    setCargando(true);
    const d = await getDeudores('pendiente');
    if (d.success) {
      const encontrado = d.deudores.find(deudor => deudor.venta_id === venta.venta_id);
      setDeudorInfo(encontrado);
      setModo(encontrado ? 'pagar' : 'registrar');
    }
    setCargando(false);
  };

  useState(() => { verificarDeudor(); }, []);

  const registrarDeuda = async () => {
    setCargando(true);
    const d = await registrarDeudorManual({
      venta_id: venta.venta_id,
      notas: `Registrada desde cierre del día - Monto: ${venta.monto_total} - Cliente: ${venta.cliente}`,
    });
    setCargando(false);
    if (d.success) {
      setMsg({ tipo: 'success', texto: d.mensaje });
      setDeudorInfo(d.deudor);
      setModo('pagar');
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } else {
      setMsg({ tipo: 'error', texto: d.error });
    }
  };

  const registrarPago = async () => {
    if (!formPago.monto || parseFloat(formPago.monto) <= 0) {
      setMsg({ tipo: 'error', texto: 'Ingresá un monto válido.' });
      return;
    }
    if (parseFloat(formPago.monto) > deudorInfo.monto_pendiente) {
      setMsg({ tipo: 'error', texto: `El monto excede la deuda pendiente (${fmt(deudorInfo.monto_pendiente)})` });
      return;
    }
    setCargando(true);
    const d = await registrarPagoDeudor({
      deudor_id: deudorInfo.id,
      monto: parseFloat(formPago.monto),
      caja: formPago.caja,
      notas: formPago.notas,
    });
    setCargando(false);
    if (d.success) {
      setMsg({ tipo: 'success', texto: `Pago registrado. Pendiente: ${fmt(d.monto_pendiente)}` });
      setFormPago({ monto: '', caja: 'efectivo', notas: '' });
      if (d.monto_pendiente === 0) {
        setTimeout(() => { onSuccess(); onClose(); }, 1500);
      } else {
        setDeudorInfo(prev => ({ ...prev, monto_pagado: parseFloat(d.monto_pagado), monto_pendiente: parseFloat(d.monto_pendiente), estado: d.estado }));
      }
    } else {
      setMsg({ tipo: 'error', texto: d.error });
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', maxWidth: 500, width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>📝 Gestionar deuda / Cuenta Corriente</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f5f5f5', borderRadius: 8 }}>
          <div style={{ fontWeight: 500 }}>{venta.cliente}</div>
          <div style={{ fontSize: 12, color: '#666' }}>Venta #{venta.venta_id} • Total: {fmt(venta.monto_total)}</div>
          <div style={{ fontSize: 12, color: '#666' }}>Método original: {venta.metodo_pago}</div>
        </div>
        {cargando && <div className="msg info">Cargando...</div>}
        {!cargando && modo === 'registrar' && (
          <div>
            <p>⚠️ Esta venta aún NO está registrada como deuda en cuenta corriente.</p>
            <p style={{ fontSize: 13, color: '#666' }}>Al registrarla, el monto total de {fmt(venta.monto_total)} quedará pendiente.</p>
            <div className="btn-row">
              <button className="btn primary" onClick={registrarDeuda}>✓ Registrar como deudor</button>
              <button className="btn" onClick={onClose}>Cancelar</button>
            </div>
          </div>
        )}
        {!cargando && modo === 'pagar' && deudorInfo && (
          <div>
            <div style={{ background: '#fce4ec', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem' }}>
              <div style={{ fontSize: 12, color: '#666' }}>Estado: {deudorInfo.estado === 'pendiente' ? '⚠️ Pendiente' : deudorInfo.estado === 'parcial' ? '🟡 Pago parcial' : '✅ Pagado'}</div>
              <div style={{ fontSize: 12, color: '#666' }}>Deuda pendiente</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#e24b4a' }}>{fmt(deudorInfo.monto_pendiente)}</div>
              <div style={{ fontSize: 11, color: '#666' }}>Original: {fmt(deudorInfo.monto_original)} • Pagado: {fmt(deudorInfo.monto_pagado)}</div>
            </div>
            {deudorInfo.monto_pendiente > 0 && (
              <>
                <div className="row">
                  <label>💰 Monto a pagar</label>
                  <input type="number" step="0.01" value={formPago.monto} onChange={e => setFormPago(f => ({ ...f, monto: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="row">
                  <label>🏦 Caja</label>
                  <select value={formPago.caja} onChange={e => setFormPago(f => ({ ...f, caja: e.target.value }))}>
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="transferencia">🏦 Transferencia</option>
                  </select>
                </div>
                <div className="row">
                  <label>📝 Notas</label>
                  <input type="text" value={formPago.notas} onChange={e => setFormPago(f => ({ ...f, notas: e.target.value }))} placeholder="Opcional" />
                </div>
                <div className="btn-row">
                  <button className="btn primary" onClick={registrarPago}>✓ Confirmar pago</button>
                </div>
              </>
            )}
            {deudorInfo.monto_pendiente === 0 && (
              <div className="msg success" style={{ textAlign: 'center' }}>✅ Esta deuda ya está completamente pagada</div>
            )}
            <div className="btn-row" style={{ marginTop: '1rem' }}>
              <button className="btn" onClick={onClose}>Cerrar</button>
            </div>
          </div>
        )}
        {msg && <div className={`msg ${msg.tipo}`} style={{ marginTop: '1rem' }}>{msg.texto}</div>}
      </div>
    </div>
  );
}

export default function CierreDia() {
  const hoy = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState(hoy);
  const [ventasConsulta, setVentasConsulta] = useState(null);
  const [msg, setMsg] = useState(null);
  const [expandido, setExpandido] = useState({});
  const [montosEditados, setMontosEditados] = useState({});
  const [modoEdicion, setModoEdicion] = useState(false);
  const [modoEdicionActivo, setModoEdicionActivo] = useState(false);
  const [deudorModal, setDeudorModal] = useState(null);

  const fmt = (n) => '$' + parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });

  // ✅ FIX: si el cierre ya está cerrado, usar los montos reales del backend
  const calcularMontosIniciales = (ingresos, cerrado) => {
    const montos = {};
    for (const ing of ingresos) {
      const total = parseFloat(ing.monto_total);
      if (cerrado) {
        // cierre ya procesado → usar monto_efectivo y monto_transferencia reales
        montos[ing.venta_id] = {
          efectivo: parseFloat(ing.monto_efectivo || 0),
          transferencia: parseFloat(ing.monto_transferencia || 0),
        };
      } else {
        // preview → calcular por defecto según método de pago
        if (ing.metodo_pago === 'efectivo') {
          montos[ing.venta_id] = { efectivo: total, transferencia: 0 };
        } else if (ing.metodo_pago === 'cuenta_corriente') {
          montos[ing.venta_id] = { efectivo: 0, transferencia: 0 };
        } else {
          montos[ing.venta_id] = { efectivo: 0, transferencia: total };
        }
      }
    }
    return montos;
  };

  const consultarVentas = async () => {
    setMsg(null);
    setModoEdicion(true);
    setModoEdicionActivo(false);
    const d = await getDetalleCierre(fecha);
    if (d.success) {
      setVentasConsulta(d);
      // ✅ pasar cerrado para que use los montos reales si ya está procesado
      setMontosEditados(calcularMontosIniciales(d.ingresos, d.cierre?.cerrado === true));
    } else {
      setVentasConsulta(null);
      setModoEdicion(false);
      setMsg({ tipo: 'info', texto: d.error });
    }
  };

  const activarEdicion = () => { setModoEdicionActivo(true); setMsg(null); };

  const actualizarMonto = (venta_id, campo, valor) => {
    const total = parseFloat(ventasConsulta.ingresos.find(i => i.venta_id === venta_id)?.monto_total || 0);
    let num = parseFloat(valor) || 0;
    if (num < 0) num = 0;
    setMontosEditados(prev => {
      const otro = campo === 'efectivo' ? 'transferencia' : 'efectivo';
      let nuevoValorOtro = total - num;
      if (nuevoValorOtro < 0) nuevoValorOtro = 0;
      return { ...prev, [venta_id]: { [campo]: num, [otro]: parseFloat(nuevoValorOtro.toFixed(2)) } };
    });
  };

  const calcularTotalesPreview = () => {
    if (!ventasConsulta?.ingresos) return { efectivo: 0, transferencia: 0 };
    return ventasConsulta.ingresos.reduce((acc, ing) => {
      const m = montosEditados[ing.venta_id] || { efectivo: 0, transferencia: 0 };
      acc.efectivo += m.efectivo || 0;
      acc.transferencia += m.transferencia || 0;
      return acc;
    }, { efectivo: 0, transferencia: 0 });
  };

  const totalesPreview = calcularTotalesPreview();

  const validarMontos = () => {
    for (const ing of ventasConsulta.ingresos) {
      if (ing.metodo_pago === 'cuenta_corriente') continue;
      const m = montosEditados[ing.venta_id];
      const total = parseFloat(ing.monto_total);
      const suma = (m?.efectivo || 0) + (m?.transferencia || 0);
      if (Math.abs(suma - total) > 0.01) {
        return `Venta #${ing.venta_id} (${ing.cliente}): los montos deben sumar ${fmt(total)}. Actual: ${fmt(suma)}`;
      }
    }
    return null;
  };

  const cerrarDia = async () => {
    if (ventasConsulta?.cierre?.cerrado) {
      setMsg({ tipo: 'error', texto: `⚠️ El día ${fecha} ya está cerrado. No se puede volver a cerrar.` });
      return;
    }
    const error = validarMontos();
    if (error) { setMsg({ tipo: 'error', texto: error }); return; }
    const body = { fecha };
    for (const [venta_id, montos] of Object.entries(montosEditados)) {
      body[`mixto_efectivo_${venta_id}`] = montos.efectivo;
      body[`mixto_transferencia_${venta_id}`] = montos.transferencia;
    }
    const d = await procesarCierre(body);
    if (d.success) {
      setMsg({ tipo: 'success', texto: `✅ Cierre del día ${fecha} procesado. Efectivo: ${fmt(d.total_efectivo)} | Transferencia: ${fmt(d.total_transferencia)}` });
      consultarVentas();
      setModoEdicionActivo(false);
    } else {
      setMsg({ tipo: 'error', texto: d.error });
    }
  };

  const toggleExpandido = (id) => setExpandido(prev => ({ ...prev, [id]: !prev[id] }));

  const contarVentasPorMetodo = () => {
    if (!ventasConsulta?.ingresos) return { efectivo: 0, transferencia: 0, mixto: 0, cuenta_corriente: 0 };
    return ventasConsulta.ingresos.reduce((acc, ing) => {
      if (ing.metodo_pago === 'efectivo') acc.efectivo++;
      else if (ing.metodo_pago === 'mixto') acc.mixto++;
      else if (ing.metodo_pago === 'cuenta_corriente') acc.cuenta_corriente++;
      else acc.transferencia++;
      return acc;
    }, { efectivo: 0, transferencia: 0, mixto: 0, cuenta_corriente: 0 });
  };

  const ventasPorMetodo = contarVentasPorMetodo();
  const yaEstaCerrado = ventasConsulta?.cierre?.cerrado === true;
  const mostrarTotalesEditados = modoEdicionActivo && !yaEstaCerrado;
  const totalEfectivoMostrar = mostrarTotalesEditados ? totalesPreview.efectivo : ventasConsulta?.cierre?.total_efectivo || 0;
  const totalTransferenciaMostrar = mostrarTotalesEditados ? totalesPreview.transferencia : ventasConsulta?.cierre?.total_transferencia || 0;

  return (
    <div>
      {deudorModal && (
        <ModalDeudor venta={deudorModal} onClose={() => setDeudorModal(null)} onSuccess={() => consultarVentas()} />
      )}

      <div className="card">
        <h3>📅 Consulta y cierre de día por fecha de entrega</h3>
        <p style={{ fontSize: 13, color: '#666', marginBottom: '1rem' }}>
          Seleccioná la fecha de ENTREGA de las ventas que querés consultar o cerrar.
        </p>
        <div className="row">
          <label>📆 Fecha de entrega</label>
          <input
            type="date"
            value={fecha}
            onChange={e => {
              setFecha(e.target.value);
              setVentasConsulta(null); setMsg(null);
              setModoEdicion(false); setModoEdicionActivo(false);
            }}
            style={{ maxWidth: 200 }}
          />
        </div>
        <div className="btn-row">
          <button className="btn" onClick={consultarVentas}>
            👁 Consultar ventas entregadas el {fecha}
          </button>
          {ventasConsulta && !yaEstaCerrado && !modoEdicionActivo && (
            <button className="btn" onClick={activarEdicion} style={{ background: '#ffc107', color: '#333' }}>
              ✏️ Editar montos efectivo/transferencia
            </button>
          )}
          <button
            className="btn primary"
            onClick={cerrarDia}
            disabled={!modoEdicionActivo || yaEstaCerrado}
            style={{ opacity: (modoEdicionActivo && !yaEstaCerrado) ? 1 : 0.5 }}
          >
            ✓ Confirmar cierre del {fecha}
          </button>
        </div>
        {yaEstaCerrado && (
          <div className="msg warning" style={{ background: '#fff3cd', color: '#856404', padding: '10px', borderRadius: '8px', marginTop: '10px' }}>
            ⚠️ ATENCIÓN: El día {fecha} ya fue cerrado. No se puede volver a cerrar.
          </div>
        )}
        {msg && <div className={`msg ${msg.tipo}`}>{msg.texto}</div>}
      </div>

      {ventasConsulta?.ingresos && (
        <>
          <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <h2 style={{ color: 'white', marginBottom: '0.5rem' }}>
              📋 VENTAS ENTREGADAS EL {ventasConsulta.cierre.fecha}
            </h2>
            <p style={{ opacity: 0.9, marginBottom: 0 }}>
              {ventasConsulta.ingresos?.length || 0} ventas encontradas
              {yaEstaCerrado && (
                <span style={{ marginLeft: 12, background: '#dc3545', padding: '4px 12px', borderRadius: 20, fontSize: 12 }}>
                  ⚠️ DÍA YA CERRADO
                </span>
              )}
              {modoEdicionActivo && !yaEstaCerrado && (
                <span style={{ marginLeft: 12, background: '#ffc107', padding: '4px 12px', borderRadius: 20, fontSize: 12, color: '#333' }}>
                  ✏️ MODO EDICIÓN ACTIVO
                </span>
              )}
            </p>
          </div>

          <div className="card">
            <h3>💰 Resumen del día</h3>
            <div style={{ display: 'flex', gap: 16, marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div className="metric" style={{ background: '#e8f5e9' }}>
                <div className="label">💵 Efectivo</div>
                <div className="value green">{ventasPorMetodo.efectivo} ventas</div>
              </div>
              <div className="metric" style={{ background: '#e3f2fd' }}>
                <div className="label">🏦 Transferencia</div>
                <div className="value blue">{ventasPorMetodo.transferencia} ventas</div>
              </div>
              <div className="metric" style={{ background: '#fff3e0' }}>
                <div className="label">🔄 Mixto</div>
                <div className="value">{ventasPorMetodo.mixto} ventas</div>
              </div>
              <div className="metric" style={{ background: '#fce4ec' }}>
                <div className="label">📝 Cta Corriente</div>
                <div className="value red">{ventasPorMetodo.cuenta_corriente} deudas</div>
              </div>
            </div>

            <div className="grid-4">
              <div className="metric">
                <div className="label">💵 Total Efectivo</div>
                <div className="value green" style={{ fontSize: 22, fontWeight: 'bold' }}>
                  {fmt(totalEfectivoMostrar)}
                </div>
                {yaEstaCerrado && (
                  <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>✅ valor registrado</div>
                )}
              </div>
              <div className="metric">
                <div className="label">🏦 Total Transferencia</div>
                <div className="value blue" style={{ fontSize: 22, fontWeight: 'bold' }}>
                  {fmt(totalTransferenciaMostrar)}
                </div>
                {yaEstaCerrado && (
                  <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>✅ valor registrado</div>
                )}
              </div>
              <div className="metric">
                <div className="label">📝 Cuenta Corriente</div>
                <div className="value">{fmt(ventasConsulta.cierre.total_cuenta_corriente)}</div>
              </div>
              <div className="metric">
                <div className="label">💸 Gastos</div>
                <div className="value red">
                  {fmt(parseFloat(ventasConsulta.cierre.total_gastos_efectivo) + parseFloat(ventasConsulta.cierre.total_gastos_transferencia))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <div className="list-item">
                <span>🏁 Saldo efectivo inicio</span>
                <span>{fmt(ventasConsulta.cierre.saldo_inicio_efectivo)}</span>
              </div>
              <div className="list-item" style={{ background: '#e8f5e9', fontWeight: 'bold' }}>
                <span>🏁 Saldo efectivo FIN {mostrarTotalesEditados ? '(estimado)' : ''}</span>
                <span style={{ color: '#1d9e75' }}>
                  {mostrarTotalesEditados
                    ? fmt(ventasConsulta.cierre.saldo_inicio_efectivo + totalesPreview.efectivo)
                    : fmt(ventasConsulta.cierre.saldo_fin_efectivo)}
                </span>
              </div>
              <div className="list-item">
                <span>🏦 Saldo transferencia inicio</span>
                <span>{fmt(ventasConsulta.cierre.saldo_inicio_transferencia)}</span>
              </div>
              <div className="list-item" style={{ background: '#e3f2fd', fontWeight: 'bold' }}>
                <span>🏦 Saldo transferencia FIN {mostrarTotalesEditados ? '(estimado)' : ''}</span>
                <span style={{ color: '#185fa5' }}>
                  {mostrarTotalesEditados
                    ? fmt(ventasConsulta.cierre.saldo_inicio_transferencia + totalesPreview.transferencia)
                    : fmt(ventasConsulta.cierre.saldo_fin_transferencia)}
                </span>
              </div>
              <div className="list-item">
                <span>📦 Valor stock al cierre</span>
                <span>{fmt(ventasConsulta.cierre.valor_stock_cierre)}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 12 }}>
              <h3 style={{ margin: 0 }}>
                📋 Detalle de ventas del {fecha} ({ventasConsulta.ingresos.length})
              </h3>
              {modoEdicionActivo && !yaEstaCerrado && (
                <div style={{ display: 'flex', gap: 16, fontSize: 13, background: '#f5f5f5', padding: '6px 12px', borderRadius: 20 }}>
                  <span style={{ color: '#1d9e75', fontWeight: 600 }}>💵 Efectivo: {fmt(totalesPreview.efectivo)}</span>
                  <span style={{ color: '#185fa5', fontWeight: 600 }}>🏦 Transferencia: {fmt(totalesPreview.transferencia)}</span>
                </div>
              )}
            </div>

            {ventasConsulta.ingresos.map(ing => {
              const montos = montosEditados[ing.venta_id] || { efectivo: 0, transferencia: 0 };
              const total = parseFloat(ing.monto_total);
              const suma = montos.efectivo + montos.transferencia;
              const sumaOk = Math.abs(suma - total) < 0.01;
              const diferencia = total - suma;
              const esCuentaCorriente = ing.metodo_pago === 'cuenta_corriente';
              const efectivoExcede = montos.efectivo > total;
              const transferenciaExcede = montos.transferencia > total;
              const hayExceso = efectivoExcede || transferenciaExcede;

              return (
                <div key={ing.venta_id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 15 }}>
                        👤 {ing.cliente}
                        {ing.cliente_local && <span style={{ fontWeight: 400, color: '#888', fontSize: 13 }}> — {ing.cliente_local}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Venta #{ing.venta_id} • Entregada el {fecha}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`badge ${ing.metodo_pago === 'efectivo' ? 'green' : esCuentaCorriente ? 'amber' : 'blue'}`}>
                        {esCuentaCorriente ? '📝 Cuenta Corriente' : ing.metodo_pago === 'mixto' ? '🔄 Mixto' : ing.metodo_pago === 'efectivo' ? '💵 Efectivo' : '🏦 Transferencia'}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{fmt(total)}</span>
                      <button className="btn" style={{ fontSize: 12, padding: '3px 10px' }} onClick={() => toggleExpandido(ing.venta_id)}>
                        {expandido[ing.venta_id] ? '▲ Ocultar' : '▼ Ver detalle'}
                      </button>
                    </div>
                  </div>

                  {/* ✅ MODO EDICIÓN: solo si no está cerrado */}
                  {modoEdicionActivo && !yaEstaCerrado && !esCuentaCorriente && (
                    <div style={{ marginTop: '0.75rem', background: hayExceso ? '#fff0f0' : '#f0f7ff', border: `1px solid ${hayExceso ? '#ffb3b3' : '#b8d4ff'}`, borderRadius: 8, padding: '0.75rem' }}>
                      <div style={{ fontSize: 12, color: hayExceso ? '#dc3545' : '#0056b3', marginBottom: 8, fontWeight: 500 }}>
                        ✏️ EDITAR MONTOS — total: {fmt(total)}
                      </div>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <label style={{ fontSize: 13, color: '#555', whiteSpace: 'nowrap' }}>💵 Efectivo</label>
                          <input
                            type="number" min="0" step="0.01" value={montos.efectivo}
                            onChange={e => actualizarMonto(ing.venta_id, 'efectivo', e.target.value)}
                            style={{ width: 120, padding: '6px 10px', borderRadius: 6, border: `1px solid ${efectivoExcede ? '#dc3545' : '#ccc'}`, fontSize: 14, fontWeight: 500, backgroundColor: efectivoExcede ? '#fff0f0' : '#fff', color: efectivoExcede ? '#dc3545' : '#333' }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <label style={{ fontSize: 13, color: '#555', whiteSpace: 'nowrap' }}>🏦 Transferencia</label>
                          <input
                            type="number" min="0" step="0.01" value={montos.transferencia}
                            onChange={e => actualizarMonto(ing.venta_id, 'transferencia', e.target.value)}
                            style={{ width: 120, padding: '6px 10px', borderRadius: 6, border: `1px solid ${transferenciaExcede ? '#dc3545' : '#ccc'}`, fontSize: 14, fontWeight: 500, backgroundColor: transferenciaExcede ? '#fff0f0' : '#fff', color: transferenciaExcede ? '#dc3545' : '#333' }}
                          />
                        </div>
                        <div style={{ fontSize: 13, padding: '4px 12px', borderRadius: 20, background: sumaOk ? '#d4edda' : (diferencia > 0 ? '#fff3cd' : '#f8d7da'), color: sumaOk ? '#155724' : (diferencia > 0 ? '#856404' : '#721c24'), fontWeight: 'bold' }}>
                          {sumaOk ? '✅ Correcto' : (diferencia > 0 ? `⚠️ FALTAN ${fmt(diferencia)}` : `❌ SOBRAN ${fmt(Math.abs(diferencia))}`)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ✅ VISTA READONLY: montos reales si está cerrado, defaults si es preview sin edición */}
                  {(!modoEdicionActivo || yaEstaCerrado) && !esCuentaCorriente && (
                    <div style={{ marginTop: '0.75rem', background: yaEstaCerrado ? '#f0fff4' : '#e9ecef', border: yaEstaCerrado ? '1px solid #b2dfdb' : 'none', borderRadius: 8, padding: '0.75rem' }}>
                      <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>
                        {yaEstaCerrado ? '✅ Montos registrados en el cierre:' : '📊 Montos por defecto:'}
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: yaEstaCerrado ? 600 : 400 }}>💵 Efectivo: {fmt(montos.efectivo)}</span>
                        <span style={{ fontWeight: yaEstaCerrado ? 600 : 400 }}>🏦 Transferencia: {fmt(montos.transferencia)}</span>
                      </div>
                      {!yaEstaCerrado && (
                        <div style={{ fontSize: 11, color: '#888', marginTop: 5 }}>
                          💡 Hacé clic en "Editar montos" para modificar
                        </div>
                      )}
                    </div>
                  )}

                  {!yaEstaCerrado && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <button
                        className="btn"
                        style={{ fontSize: 12, padding: '6px 12px', background: '#6c757d', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 4 }}
                        onClick={() => setDeudorModal(ing)}
                      >
                        📝 Gestionar como deudor / cuenta corriente
                      </button>
                    </div>
                  )}

                  {expandido[ing.venta_id] && (
                    <div style={{ marginTop: '0.75rem', background: '#f9f9f9', borderRadius: 8, padding: '0.75rem' }}>
                      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ color: '#888', textAlign: 'left' }}>
                            <th>Producto</th>
                            <th>Presentación</th>
                            <th style={{ textAlign: 'right' }}>Cant.</th>
                            <th style={{ textAlign: 'right' }}>P. venta</th>
                            <th style={{ textAlign: 'right' }}>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ing.detalles.map((det, i) => (
                            <tr key={i} style={{ borderTop: '1px solid #eee' }}>
                              <td style={{ padding: '5px 0' }}>{det.producto}</td>
                              <td style={{ padding: '5px 0', color: '#666' }}>{det.presentacion}</td>
                              <td style={{ padding: '5px 0', textAlign: 'right' }}>{det.cantidad}</td>
                              <td style={{ padding: '5px 0', textAlign: 'right' }}>{fmt(det.precio_unitario)}</td>
                              <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 500 }}>{fmt(det.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid #ddd', fontWeight: 600 }}>
                            <td colSpan={4}>Total</td>
                            <td style={{ textAlign: 'right' }}>{fmt(total)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}