// src/components/HistorialCierres.jsx
/// src/components/HistorialCierres.jsx
import { useState, useEffect } from 'react';
import { getHistorialCierres, getDetalleCierre } from '../api/pagosApi';

export default function HistorialCierres() {
  const hoy = new Date().toISOString().split('T')[0];

  const [fecha, setFecha] = useState(hoy);
  const [cierres, setCierres] = useState(null);
  const [totales, setTotales] = useState(null);
  const [movimientosLista, setMovimientosLista] = useState([]); // ✅ movimientos desde buscar()
  const [detalle, setDetalle] = useState(null);
  const [expandido, setExpandido] = useState({});
  const [msg, setMsg] = useState(null);
  const [cargando, setCargando] = useState(false);

  const fmt = (n) => '$' + parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });
  const fmtPct = (n) => parseFloat(n || 0).toFixed(1) + '%';
  const fmtRaw = (n) => parseFloat(n || 0).toFixed(2);

  const buscar = async () => {
    if (!fecha) {
      setMsg({ tipo: 'error', texto: 'Seleccione una fecha válida' });
      return;
    }
    setCargando(true);
    setMsg(null);
    setCierres(null);
    setDetalle(null);
    setMovimientosLista([]);

    const d = await getHistorialCierres(fecha);
    setCargando(false);

    if (d.success) {
      if (d.existe === false) {
        setMsg({ tipo: 'info', texto: `No hay cierre para el día ${fecha}.` });
        setCierres([]);
        setTotales(null);
      } else {
        setCierres(d.cierres);
        setTotales(d.totales);
        setMovimientosLista(d.movimientos_extra || []); // ✅ guardar movimientos
      }
    } else {
      setMsg({ tipo: 'error', texto: d.error });
    }
  };

  const verDetalle = async (fechaDetalle) => {
    setCargando(true);
    setMsg(null);
    const d = await getDetalleCierre(fechaDetalle);
    setCargando(false);
    if (d.success) {
      const movsFinal = (d.movimientos_extra && d.movimientos_extra.length > 0)
        ? d.movimientos_extra
        : movimientosLista;
      setDetalle({ fecha: fechaDetalle, ...d, movimientos_extra: movsFinal });
    } else {
      setMsg({ tipo: 'error', texto: d.error });
    }
  };

  const toggleExpandido = (id) =>
    setExpandido(prev => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => { buscar(); }, []);

  // ==============================
  // EXPORTAR A EXCEL (ESTILO PREMIUM AMARILLO Y NEGRO)
  // ==============================
  const exportarExcel = (ci, ingresos, movimientos, fechaExcel) => {
    const totalEfectivo = ingresos.reduce((a, i) => a + parseFloat(i.monto_efectivo || 0), 0);
    const totalTransf = ingresos.reduce((a, i) => a + parseFloat(i.monto_transferencia || 0), 0);
    const totalVenta = ingresos.reduce((a, i) => a + parseFloat(i.monto_total || 0), 0);
    const totalCosto = ingresos.reduce((a, i) => a + parseFloat(i.costo_total || 0), 0);
    const totalGanancia = ingresos.reduce((a, i) => a + parseFloat(i.ganancia || 0), 0);
    const totalGastos = movimientos.filter(m => m.tipo === 'gasto').reduce((acc, m) => acc + parseFloat(m.monto || 0), 0);
    const totalIngresosExtra = movimientos.filter(m => m.tipo === 'ingreso_extra').reduce((acc, m) => acc + parseFloat(m.monto || 0), 0);

    const sTitle = 'style="font-family:\'Segoe UI\',Arial,sans-serif; font-size:18px; font-weight:bold; color:#1a1a1a; padding:10px 0;"';
    const sSubtitle = 'style="font-family:\'Segoe UI\',Arial,sans-serif; font-size:11px; color:#555555; padding-bottom:15px;"';
    const sSection = 'style="font-family:\'Segoe UI\',Arial,sans-serif; font-size:13px; font-weight:bold; color:#facc15; background-color:#1a1a1a; padding:6px 10px; border:1px solid #1a1a1a;"';
    const sHeader = 'style="font-family:\'Segoe UI\',Arial,sans-serif; font-size:11px; font-weight:bold; color:#ffffff; background-color:#2d2d2d; border:1px solid #444444; padding:5px; text-align:center;"';
    const sHeaderLeft = 'style="font-family:\'Segoe UI\',Arial,sans-serif; font-size:11px; font-weight:bold; color:#ffffff; background-color:#2d2d2d; border:1px solid #444444; padding:5px; text-align:left;"';
    const sText = 'style="font-family:\'Segoe UI\',Arial,sans-serif; font-size:11px; color:#1a1a1a; border:1px solid #cbd5e1; padding:5px; text-align:left;"';
    const sNumber = 'style="font-family:\'Segoe UI\',Arial,sans-serif; font-size:11px; color:#1a1a1a; border:1px solid #cbd5e1; padding:5px; text-align:right;"';
    const sTotal = 'style="font-family:\'Segoe UI\',Arial,sans-serif; font-size:11px; font-weight:bold; color:#1a1a1a; background-color:#fef08a; border:1px solid #eab308; padding:6px; text-align:right;"';
    const sTotalLabel = 'style="font-family:\'Segoe UI\',Arial,sans-serif; font-size:11px; font-weight:bold; color:#1a1a1a; background-color:#fef08a; border:1px solid #eab308; padding:6px; text-align:left;"';
    const sDetailText = 'style="font-family:\'Segoe UI\',Arial,sans-serif; font-size:10px; color:#444444; background-color:#fefcbf; border:1px solid #e2e8f0; padding:4px; text-align:left;"';
    const sDetailNum = 'style="font-family:\'Segoe UI\',Arial,sans-serif; font-size:10px; color:#444444; background-color:#fefcbf; border:1px solid #e2e8f0; padding:4px; text-align:right;"';

    let h = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse;} td{mso-number-format:"\\@";}</style></head><body style="margin:20px;">`;
    h += `<table border="1" style="border-collapse:collapse; border-color:#cbd5e1;">`;
    h += `<tr><td colspan="11" ${sTitle}>REPORTE DE CIERRE COMERCIAL DIARIO</td></tr>`;
    h += `<tr><td colspan="11" ${sSubtitle}><b>Fecha:</b> ${fechaExcel} &nbsp;|&nbsp; <b>Generado:</b> ${new Date().toLocaleDateString('es-AR')}</td></tr><tr><td colspan="11"></td></tr>`;
    
    h += `<tr><td colspan="4" ${sSection}>1. BALANCE DE CONTROL Y CAJA</td><td></td><td colspan="6" ${sSection}>RENDIMIENTO FINANCIERO DEL DÍA</td></tr>`;
    h += `<tr><td colspan="2" ${sHeaderLeft}>Métrica de Caja</td><td colspan="2" ${sHeader}>Valor Registrado</td><td></td><td colspan="3" ${sHeaderLeft}>Concepto Financiero</td><td colspan="3" ${sHeader}>Valor Calculado</td></tr>`;
    h += `<tr><td colspan="2" ${sText}>Efectivo Cobrado en Ventas</td><td colspan="2" ${sNumber}>$ ${fmtRaw(ci.total_efectivo)}</td><td></td><td colspan="3" ${sText}>Costo Total del Día</td><td colspan="3" ${sNumber} style="color:#b91c1c; border:1px solid #cbd5e1;">$ ${fmtRaw(ci.costo_total_dia || ci.total_costo)}</td></tr>`;
    h += `<tr><td colspan="2" ${sText}>Transferencias Recibidas</td><td colspan="2" ${sNumber}>$ ${fmtRaw(ci.total_transferencia)}</td><td></td><td colspan="3" ${sText}><b>Ganancia Bruta</b></td><td colspan="3" ${sNumber} style="font-weight:bold; color:#15803d; border:1px solid #cbd5e1;">$ ${fmtRaw(ci.ganancia_total_dia || ci.ganancia)}</td></tr>`;
    h += `<tr><td colspan="2" ${sText}>Cuentas Corrientes Emitidas</td><td colspan="2" ${sNumber}>$ ${fmtRaw(ci.total_cuenta_corriente)}</td><td></td><td colspan="3" ${sText}>Margen de Rentabilidad</td><td colspan="3" ${sNumber} style="font-weight:bold; color:#1d4ed8; border:1px solid #cbd5e1;">${fmtPct(ci.margen_total_dia || ci.margen)}</td></tr>`;
    h += `<tr><td colspan="2" ${sText}>Gastos Operativos (Ef.)</td><td colspan="2" ${sNumber} style="color:#b91c1c;">$ ${fmtRaw(ci.total_gastos_efectivo)}</td><td></td><td colspan="3" ${sText}>Estado de la Caja</td><td colspan="3" ${sNumber} style="font-weight:bold;">${ci.cerrado ? 'CERRADO' : 'ABIERTO'}</td></tr>`;
    h += `<tr><td colspan="2" ${sText}>Gastos Operativos (Transf.)</td><td colspan="2" ${sNumber} style="color:#b91c1c;">$ ${fmtRaw(ci.total_gastos_transferencia)}</td><td></td><td colspan="3" ${sText}>Valor Stock al Cierre</td><td colspan="3" ${sNumber}>$ ${fmtRaw(ci.valor_stock_cierre)}</td></tr>`;
    h += `<tr><td colspan="2" ${sText}>Saldo Inicial (Ef.)</td><td colspan="2" ${sNumber}>$ ${fmtRaw(ci.saldo_inicio_efectivo)}</td><td colspan="7"></td></tr>`;
    h += `<tr><td colspan="2" ${sText}>Saldo Final Físico (Ef.)</td><td colspan="2" ${sNumber} style="font-weight:bold;">$ ${fmtRaw(ci.saldo_fin_efectivo)}</td><td colspan="7"></td></tr>`;
    h += `<tr><td colspan="2" ${sText}>Saldo Inicial (Transf.)</td><td colspan="2" ${sNumber}>$ ${fmtRaw(ci.saldo_inicio_transferencia)}</td><td colspan="7"></td></tr>`;
    h += `<tr><td colspan="2" ${sText}>Saldo Final Consolidado (Transf.)</td><td colspan="2" ${sNumber} style="font-weight:bold;">$ ${fmtRaw(ci.saldo_fin_transferencia)}</td><td colspan="7"></td></tr>`;
    
    h += `<tr><td colspan="11"></td></tr><tr><td colspan="11" ${sSection}>2. REGISTRO AUDITADO DE VENTAS Y FACTURACIÓN</td></tr>`;
    h += `<tr><td ${sHeader}>ID Venta</td><td colspan="2" ${sHeaderLeft}>Cliente / Razón Social</td><td ${sHeaderLeft}>Sucursal</td><td ${sHeader}>Canal Pago</td><td ${sHeader}>Ef. Cobrado</td><td ${sHeader}>Transf. Cobrada</td><td ${sHeader}>Total Factura</td><td ${sHeader}>Costo Total</td><td ${sHeader}>Ganancia Neto</td><td ${sHeader}>Margen %</td></tr>`;

    ingresos.forEach(ing => {
      h += `<tr>
        <td ${sText} style="text-align:center; font-weight:bold;">#${ing.venta_id}</td>
        <td colspan="2" ${sText}>${ing.cliente} ${ing.es_deudor ? '<b>(DEUDOR)</b>' : ''}</td>
        <td ${sText}>${ing.cliente_local || '-'}</td>
        <td ${sText} style="text-align:center; text-transform:uppercase; font-size:10px;">${ing.metodo_pago}</td>
        <td ${sNumber}>$ ${fmtRaw(ing.monto_efectivo)}</td>
        <td ${sNumber}>$ ${fmtRaw(ing.monto_transferencia)}</td>
        <td ${sNumber} style="font-weight:bold;">$ ${fmtRaw(ing.monto_total)}</td>
        <td ${sNumber}>$ ${fmtRaw(ing.costo_total)}</td>
        <td ${sNumber} style="color:#15803d;">$ ${fmtRaw(ing.ganancia)}</td>
        <td ${sNumber}>${fmtPct(ing.margen)}</td>
      </tr>`;

      if (ing.detalles?.length > 0) {
        h += `<tr><td></td><td colspan="2" ${sHeaderLeft} style="background-color:#444444; color:#facc15; font-size:10px;">↳ Artículo / Producto</td><td ${sHeaderLeft} style="background-color:#444444; color:#facc15; font-size:10px;">Presentación</td><td ${sHeader} style="background-color:#444444; color:#facc15; font-size:10px;">Cant.</td><td ${sHeader} style="background-color:#444444; color:#facc15; font-size:10px;">P. Venta</td><td ${sHeader} style="background-color:#444444; color:#facc15; font-size:10px;">P. Costo</td><td ${sHeader} style="background-color:#444444; color:#facc15; font-size:10px;">Subtotal</td><td colspan="3" style="background-color:#fefcbf;"></td></tr>`;
        ing.detalles.forEach(det => {
          h += `<tr><td></td><td colspan="2" ${sDetailText}>${det.producto}</td><td ${sDetailText}>${det.presentacion || '-'}</td><td ${sDetailNum}>${det.cantidad}</td><td ${sDetailNum}>$ ${fmtRaw(det.precio_unitario)}</td><td ${sDetailNum}>$ ${fmtRaw(det.precio_compra)}</td><td ${sDetailNum} style="font-weight:bold;">$ ${fmtRaw(det.subtotal)}</td><td colspan="3" style="background-color:#fefcbf;"></td></tr>`;
        });
      }
    });

    h += `<tr><td colspan="5" ${sTotalLabel}>TOTALES CONSOLIDADOS DE VENTAS</td><td ${sTotal}>$ ${fmtRaw(totalEfectivo)}</td><td ${sTotal}>$ ${fmtRaw(totalTransf)}</td><td ${sTotal}>$ ${fmtRaw(totalVenta)}</td><td ${sTotal} style="color:#b91c1c;">$ ${fmtRaw(totalCosto)}</td><td ${sTotal} style="color:#15803d;">$ ${fmtRaw(totalGanancia)}</td><td ${sTotal}></td></tr>`;
    h += `<tr><td colspan="11"></td></tr><tr><td colspan="11" ${sSection}>3. MOVIMIENTOS AUXILIARES DE CAJA Y GASTOS</td></tr>`;

    if (movimientos.length === 0) {
      h += `<tr><td colspan="11" ${sText} style="font-style:italic; color:#555555;">Sin movimientos extraordinarios registrados en la fecha.</td></tr>`;
    } else {
      h += `<tr><td colspan="2" ${sHeaderLeft}>Tipo de Movimiento</td><td colspan="3" ${sHeaderLeft}>Categoría analítica</td><td colspan="3" ${sHeaderLeft}>Descripción / Concepto</td><td ${sHeader}>Caja</td><td colspan="2" ${sHeader}>Monto</td></tr>`;
      movimientos.forEach(m => {
        const esGasto = m.tipo === 'gasto';
        h += `<tr><td colspan="2" ${sText} style="font-weight:bold; color:${esGasto ? '#b91c1c' : '#15803d'};">${esGasto ? '[-] GASTO' : '[+] INGRESO EXTRA'}</td><td colspan="3" ${sText}>${m.categoria || 'General'}</td><td colspan="3" ${sText}>${m.descripcion || 'Sin descripción'}</td><td ${sText} style="text-align:center; text-transform:uppercase;">${m.caja}</td><td colspan="2" ${sNumber} style="font-weight:bold; color:${esGasto ? '#b91c1c' : '#15803d'};">$ ${fmtRaw(m.monto)}</td></tr>`;
      });
      h += `<tr><td colspan="11"></td></tr><tr><td colspan="5" ${sTotalLabel}>RESUMEN DE CONTABILIDAD AUXILIAR</td><td colspan="3" ${sTotalLabel} style="background-color:#fee2e2; color:#991b1b;">TOTAL GASTOS DEL DÍA:</td><td colspan="3" ${sTotal} style="background-color:#fee2e2; color:#991b1b;">$ ${fmtRaw(totalGastos)}</td></tr>`;
      h += `<tr><td colspan="5"></td><td colspan="3" ${sTotalLabel}>TOTAL INGRESOS EXTRA:</td><td colspan="3" ${sTotal}>$ ${fmtRaw(totalIngresosExtra)}</td></tr>`;
    }

    h += `</table></body></html>`;

    const blob = new Blob([h], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cierre_Comercial_${fechaExcel}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==============================
  // RENDER MOVIMIENTOS (reutilizable)
  // ==============================
  const renderMovimientos = (movimientos) => {
    if (!movimientos || movimientos.length === 0) return null;

    const gastos = movimientos.filter(m => m.tipo === 'gasto');
    const ingresosExtra = movimientos.filter(m => m.tipo === 'ingreso_extra');
    const totalGastos = gastos.reduce((a, m) => a + parseFloat(m.monto || 0), 0);
    const totalIngresosExtra = ingresosExtra.reduce((a, m) => a + parseFloat(m.monto || 0), 0);

    const gastosPorCategoria = {};
    gastos.forEach(m => {
      const cat = m.categoria || 'Sin categoría';
      if (!gastosPorCategoria[cat]) gastosPorCategoria[cat] = { total: 0, items: [] };
      gastosPorCategoria[cat].total += parseFloat(m.monto || 0);
      gastosPorCategoria[cat].items.push(m);
    });

    return (
      <div className="card">
        <h3>↕ Movimientos extra del día ({movimientos.length})</h3>
        <div style={{ display: 'flex', gap: 16, marginBottom: '1rem', flexWrap: 'wrap' }}>
          {totalGastos > 0 && (
            <div style={{ background: '#fff5f5', border: '1px solid #ffd5d5', borderRadius: 8, padding: '10px 16px', flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>💸 Total gastos</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#e24b4a' }}>{fmt(totalGastos)}</div>
              <div style={{ fontSize: 11, color: '#aaa' }}>{gastos.length} movimiento{gastos.length !== 1 ? 's' : ''}</div>
            </div>
          )}
          {totalIngresosExtra > 0 && (
            <div style={{ background: '#f0fff8', border: '1px solid #b2f0d8', borderRadius: 8, padding: '10px 16px', flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>📥 Total ingresos extra</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1d9e75' }}>{fmt(totalIngresosExtra)}</div>
              <div style={{ fontSize: 11, color: '#aaa' }}>{ingresosExtra.length} movimiento{ingresosExtra.length !== 1 ? 's' : ''}</div>
            </div>
          )}
        </div>

        {gastos.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: '0.5rem' }}>💸 Gastos</div>
            {Object.entries(gastosPorCategoria).map(([cat, data]) => (
              <div key={cat} style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', borderRadius: 6, padding: '6px 10px', borderLeft: '3px solid #e24b4a', marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{cat}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e24b4a' }}>{fmt(data.total)}</span>
                </div>
                {data.items.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 10px 4px 18px', fontSize: 12, color: '#555', borderBottom: '1px solid #f5f5f5' }}>
                    <span style={{ flex: 1 }}>
                      {m.descripcion || <span style={{ color: '#bbb', fontStyle: 'italic' }}>Sin descripción</span>}
                      <span style={{ marginLeft: 8, fontSize: 10, background: '#f0f0f0', borderRadius: 4, padding: '1px 6px', color: '#888' }}>{m.caja}</span>
                    </span>
                    <span style={{ color: '#e24b4a', fontWeight: 500 }}>-{fmt(m.monto)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {ingresosExtra.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: '0.5rem' }}>📥 Ingresos extra</div>
            {ingresosExtra.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderLeft: '3px solid #1d9e75', background: '#fafafa', borderRadius: 6, marginBottom: 4, fontSize: 13 }}>
                <span style={{ flex: 1 }}>
                  {m.descripcion || m.categoria || 'Sin descripción'}
                  <span style={{ marginLeft: 8, fontSize: 10, background: '#f0f0f0', borderRadius: 4, padding: '1px 6px', color: '#888' }}>{m.caja}</span>
                </span>
                <span style={{ color: '#1d9e75', fontWeight: 600 }}>+{fmt(m.monto)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ==============================
  // VISTA DE DETALLE
  // ==============================
  if (detalle) {
    const ci = detalle.cierre;
    const movimientos = detalle.movimientos_extra || [];
    const ingresos = detalle.ingresos || [];

    return (
      <div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn" onClick={() => setDetalle(null)}>← Volver</button>
              <h3 style={{ margin: 0 }}>📋 Detalle del {detalle.fecha}</h3>
              {ci.cerrado ? <span className="badge green">✓ Cerrado</span> : <span className="badge amber">⚠ Abierto</span>}
            </div>
            <button className="btn primary" onClick={() => exportarExcel(ci, ingresos, movimientos, detalle.fecha)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              📥 Descargar Excel
            </button>
          </div>

          <div className="grid-4">
            <div className="metric"><div className="label">💵 Efectivo</div><div className="value green">{fmt(ci.total_efectivo)}</div></div>
            <div className="metric"><div className="label">🏦 Transferencia</div><div className="value blue">{fmt(ci.total_transferencia)}</div></div>
            <div className="metric"><div className="label">📝 Cta corriente</div><div className="value">{fmt(ci.total_cuenta_corriente)}</div></div>
            <div className="metric"><div className="label">📈 Ganancia</div><div className="value green">{fmt(ci.ganancia_total_dia || ci.ganancia)}</div></div>
            <div className="metric"><div className="label">📦 Costo</div><div className="value red">{fmt(ci.costo_total_dia || ci.total_costo)}</div></div>
            <div className="metric"><div className="label">🎯 Margen</div><div className="value blue">{fmtPct(ci.margen_total_dia || ci.margen)}</div></div>
            <div className="metric"><div className="label">💸 Gastos efectivo</div><div className="value red">{fmt(ci.total_gastos_efectivo)}</div></div>
            <div className="metric"><div className="label">💸 Gastos transfer.</div><div className="value red">{fmt(ci.total_gastos_transferencia)}</div></div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <div className="list-item"><span>🏁 Saldo efectivo inicio</span><span>{fmt(ci.saldo_inicio_efectivo)}</span></div>
            <div className="list-item"><span>🏁 Saldo efectivo fin</span><span>{fmt(ci.saldo_fin_efectivo)}</span></div>
            <div className="list-item"><span>🏦 Saldo transfer. inicio</span><span>{fmt(ci.saldo_inicio_transferencia)}</span></div>
            <div className="list-item"><span>🏦 Saldo transfer. fin</span><span>{fmt(ci.saldo_fin_transferencia)}</span></div>
            <div className="list-item"><span>📦 Valor stock al cierre</span><span>{fmt(ci.valor_stock_cierre)}</span></div>
          </div>
        </div>

        {ingresos.length > 0 && (
          <div className="card">
            <h3>🛒 Ventas ({ingresos.length})</h3>
            {ingresos.map(ing => (
              <div key={ing.venta_id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>
                      👤 {ing.cliente} {ing.cliente_local && <span style={{ fontWeight: 400, color: '#888', fontSize: 12 }}> — {ing.cliente_local}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#888' }}>Venta #{ing.venta_id}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`badge ${ing.metodo_pago === 'efectivo' ? 'green' : ing.metodo_pago === 'cuenta_corriente' ? 'amber' : 'blue'}`}>
                      {ing.metodo_pago}
                    </span>
                    {ing.es_deudor && <span className="badge red">deudor</span>}
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{fmt(ing.monto_total)}</span>
                    <span style={{ fontSize: 12, color: '#1d9e75' }}>+{fmt(ing.ganancia)} ({fmtPct(ing.margen)})</span>
                    <button className="btn" style={{ fontSize: 12, padding: '3px 10px' }} onClick={() => toggleExpandido(ing.venta_id)}>
                      {expandido[ing.venta_id] ? '▲ Ocultar' : '▼ Productos'}
                    </button>
                  </div>
                </div>
                {expandido[ing.venta_id] && (
                  <div style={{ marginTop: '0.5rem', background: '#f9f9f9', borderRadius: 8, padding: '0.75rem' }}>
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ color: '#888', textAlign: 'left' }}>
                          <th style={{ paddingBottom: 4 }}>Producto</th>
                          <th style={{ paddingBottom: 4 }}>Presentación</th>
                          <th style={{ paddingBottom: 4, textAlign: 'right' }}>Cant.</th>
                          <th style={{ paddingBottom: 4, textAlign: 'right' }}>P. venta</th>
                          <th style={{ paddingBottom: 4, textAlign: 'right' }}>P. compra</th>
                          <th style={{ paddingBottom: 4, textAlign: 'right' }}>Ganancia</th>
                          <th style={{ paddingBottom: 4, textAlign: 'right' }}>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ing.detalles.map((det, i) => (
                          <tr key={i} style={{ borderTop: '1px solid #eee' }}>
                            <td style={{ padding: '4px 0' }}>{det.producto}</td>
                            <td style={{ padding: '4px 0', color: '#666' }}>{det.presentacion}</td>
                            <td style={{ padding: '4px 0', textAlign: 'right' }}>{det.cantidad}</td>
                            <td style={{ padding: '4px 0', textAlign: 'right' }}>{fmt(det.precio_unitario)}</td>
                            <td style={{ padding: '4px 0', textAlign: 'right', color: '#e24b4a' }}>{fmt(det.precio_compra)}</td>
                            <td style={{ padding: '4px 0', textAlign: 'right', color: '#1d9e75' }}>{fmt(det.ganancia)}</td>
                            <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 500 }}>{fmt(det.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {renderMovimientos(movimientos)}
      </div>
    );
  }

  // ==============================
  // VISTA PRINCIPAL
  // ==============================
  return (
    <div>
      <div className="card">
        <h3>📅 Cierre del día</h3>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ maxWidth: 200 }} />
          </div>
          <button className="btn primary" onClick={buscar} disabled={cargando}>
            {cargando ? 'Buscando...' : '🔍 Buscar cierre'}
          </button>
        </div>
        {msg && <div className={`msg ${msg.tipo}`}>{msg.texto}</div>}
      </div>

      {totales && cierres?.length > 0 && (
        <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <h3 style={{ color: 'white', marginBottom: '0.75rem' }}>📊 Resumen del día {fecha}</h3>
          <div className="grid-4">
            <div className="metric"><div className="label">🛒 Ventas</div><div className="value">{totales.qty_ventas}</div></div>
            <div className="metric"><div className="label">💵 Efectivo</div><div className="value green">{fmt(totales.total_efectivo)}</div></div>
            <div className="metric"><div className="label">🏦 Transferencia</div><div className="value blue">{fmt(totales.total_transferencia)}</div></div>
            <div className="metric"><div className="label">📝 Cta corriente</div><div className="value">{fmt(totales.total_cuenta_corriente)}</div></div>
            <div className="metric"><div className="label">💸 Gastos</div><div className="value red">{fmt(totales.total_gastos)}</div></div>
            <div className="metric"><div className="label">📈 Ganancia</div><div className="value green">{fmt(totales.ganancia)}</div></div>
            <div className="metric"><div className="label">🎯 Margen</div><div className="value blue">{fmtPct(totales.margen)}</div></div>
          </div>
        </div>
      )}

      {cierres?.length > 0 && (
        <div className="card">
          <h3>📋 Cierre del día {fecha}</h3>
          {cierres.map(c => (
            <div key={c.fecha} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontWeight: 500, fontSize: 14, minWidth: 110 }}>📅 {c.fecha}</div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap', flex: 1 }}>
                  <span>{c.qty_ventas} ventas</span>
                  <span style={{ color: '#1d9e75' }}>💵 {fmt(c.total_efectivo)}</span>
                  <span style={{ color: '#185fa5' }}>🏦 {fmt(c.total_transferencia)}</span>
                  <span style={{ color: '#e24b4a' }}>💸 -{fmt(c.total_gastos)}</span>
                  <span style={{ color: '#1d9e75', fontWeight: 500 }}>📈 {fmt(c.ganancia)}</span>
                  <span style={{ color: '#185fa5' }}>🎯 {fmtPct(c.margen)}</span>
                  {c.qty_movimientos > 0 && (
                    <span style={{ color: '#888' }}>↕ {c.qty_movimientos} movimiento{c.qty_movimientos !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`badge ${c.cerrado ? 'green' : 'amber'}`}>{c.cerrado ? '✓ Cerrado' : '⚠ Abierto'}</span>
                  <button className="btn" style={{ fontSize: 12, padding: '3px 12px' }} onClick={() => verDetalle(c.fecha)}>Ver detalle →</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {renderMovimientos(movimientosLista)}
    </div>
  );
}