import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  consultarVentas, 
  importarDia, 
  getMovimientosPorFecha, 
  registrarGasto, 
  getSaldoActual, 
  getValorTotalStock,
  crearSnapshotVenta
} from '../api/ventas';
import * as XLSX from 'xlsx';
import '../App.css';

// Componentes separados para mejor organización
const ResumenCard = ({ label, value, subtext, color, icon }) => (
  <div className="resumen-card">
    <div className="resumen-card-label">
      {icon && <span className="card-icon">{icon}</span>}
      {label}
    </div>
    <div className="resumen-card-value" style={{ color }}>
      ${value.toLocaleString()}
    </div>
    {subtext && <div className="resumen-card-sub">{subtext}</div>}
  </div>
);

const ProductoProblemaAlert = ({ productos }) => {
  if (!productos?.length) return null;
  
  return (
    <div className="preview-panel" style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b', marginBottom: '20px' }}>
      <div className="preview-header">
        <h3 style={{ color: '#92400e' }}>⚠️ Productos en Stock con Precio de Compra = 0</h3>
        <span className="preview-count">{productos.length} productos</span>
      </div>
      <div className="preview-list">
        {productos.slice(0, 10).map((prod, idx) => (
          <div key={idx} className="preview-item" style={{ backgroundColor: '#fffbeb' }}>
            <span className="preview-desc">
              {prod.producto} {prod.presentacion ? `(${prod.presentacion})` : ''}
              {prod.stock && ` - Stock: ${prod.stock}`}
            </span>
          </div>
        ))}
        {productos.length > 10 && (
          <div className="preview-item">... y {productos.length - 10} más</div>
        )}
      </div>
    </div>
  );
};

const VentaDetalle = ({ venta, isExpanded, onToggle }) => {
  if (!venta) return null;
  
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: 'pointer' }} className={isExpanded ? 'fila-expandida' : ''}>
        <td><span style={{ fontSize: '18px' }}>{isExpanded ? '▼' : '▶'}</span></td>
        <td>{venta.id}</td>
        <td>
          <strong>{venta.productos?.length} producto(s)</strong>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {venta.productos?.slice(0, 2).map(p => p.nombre).join(', ')}
            {venta.productos?.length > 2 && '...'}
          </div>
        </td>
        <td style={{ color: '#f59e0b' }}>${venta.descuento?.toLocaleString()}</td>
        <td><strong>${venta.total?.toLocaleString()}</strong></td>
        <td style={{ color: '#f59e0b' }}>${venta.costo?.toLocaleString()}</td>
        <td style={{ color: '#10b981' }}><strong>${venta.ganancia?.toLocaleString()}</strong></td>
        <td>
          <span className={`badge-margen ${getMargenClass(venta.margen)}`}>
            {venta.margen}%
          </span>
        </td>
      </tr>
      {isExpanded && venta.productos && <VentaProductosDetalle venta={venta} />}
    </>
  );
};

const VentaProductosDetalle = ({ venta }) => (
  <tr className="detalle-productos">
    <td colSpan="8" style={{ padding: 0 }}>
      <div style={{ padding: '20px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <h4 style={{ marginBottom: '12px', color: '#1e293b' }}>
          📦 Detalle de Productos - Venta #{venta.id}
        </h4>
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#e2e8f0' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Producto</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Cantidad</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Precio Unit.</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Costo Unit.</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Subtotal</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Costo Total</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Ganancia</th>
            </tr>
          </thead>
          <tbody>
            {venta.productos.map((producto, idx) => (
              <tr key={idx}>
                <td style={{ padding: '8px' }}><strong>{producto.nombre}</strong></td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{producto.cantidad} und</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>${producto.precio_unitario?.toLocaleString()}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#f59e0b' }}>${producto.costo_unitario?.toLocaleString()}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>${producto.subtotal?.toLocaleString()}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#f59e0b' }}>${producto.costo_total?.toLocaleString()}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#10b981' }}>
                  ${(producto.subtotal - producto.costo_total)?.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </td>
  </tr>
);

// Helpers
const getMargenClass = (margen) => {
  if (margen > 30) return 'alto';
  if (margen > 15) return 'medio';
  return 'bajo';
};

const formatDate = (date) => date.toISOString().split('T')[0];

const CajaUnificada = () => {
  // Estados
  const [fecha, setFecha] = useState(() => formatDate(new Date()));
  const [ventas, setVentas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [gastos, setGastos] = useState([]);
  const [gastosPendientes, setGastosPendientes] = useState([]);
  const [ventaExpandida, setVentaExpandida] = useState(null);
  const [montoGasto, setMontoGasto] = useState('');
  const [descripcionGasto, setDescripcionGasto] = useState('');
  const [metodoPagoGasto, setMetodoPagoGasto] = useState('efectivo');
  const [saldo, setSaldo] = useState(0);
  const [valorStock, setValorStock] = useState(0);
  const [valorTotalEmpresa, setValorTotalEmpresa] = useState(0);
  const [productosConProblemas, setProductosConProblemas] = useState([]);
  const [movimientosData, setMovimientosData] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ text: '', type: '' });
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [importando, setImportando] = useState(false);

  // Memoized values
  const totalGastos = useMemo(() => gastos.reduce((sum, g) => sum + parseFloat(g.monto), 0), [gastos]);
  const totalPendientes = useMemo(() => gastosPendientes.reduce((sum, g) => sum + g.monto, 0), [gastosPendientes]);
  const gananciasHoy = useMemo(() => resumen?.ganancia_total || 0, [resumen]);
  const resultadoDia = useMemo(() => gananciasHoy - totalGastos, [gananciasHoy, totalGastos]);

  // Funciones
  const showMessage = (text, type = 'success') => {
    setMensaje({ text, type });
    setTimeout(() => setMensaje({ text: '', type: '' }), 5000);
  };

  const showError = (text) => {
    setMensaje({ text, type: 'error' });
    setTimeout(() => setMensaje({ text: '', type: '' }), 5000);
  };

  // 🔥 FUNCIÓN PARA CARGAR SOLO LOS GASTOS
  const cargarGastos = useCallback(async () => {
    try {
      const movimientos = await getMovimientosPorFecha(fecha);
      if (movimientos.success && movimientos.detalles) {
        const soloGastos = movimientos.detalles.filter(d => d.tipo === 'gasto');
        console.log('💰 Gastos cargados:', soloGastos.length);
        setGastos(soloGastos);
        return soloGastos;
      }
    } catch (error) {
      console.error('Error cargando gastos:', error);
    }
    return [];
  }, [fecha]);

  const cargarStockActual = useCallback(async () => {
    try {
      const stockData = await getValorTotalStock();
      if (stockData.success) {
        setValorStock(stockData.valor_total_stock);
        setValorTotalEmpresa(stockData.valor_total_empresa);
        setProductosConProblemas(stockData.productos_con_problemas || []);
      }
    } catch (error) {
      console.error('Error cargando stock:', error);
    }
  }, []);

  const crearSnapshotsDeVentas = useCallback(async (ventasLista) => {
    for (const venta of ventasLista) {
      try {
        await crearSnapshotVenta(venta.id);
      } catch (error) {
        console.error(`Error creando snapshot para venta ${venta.id}:`, error);
      }
    }
  }, []);

  const cargarTodo = useCallback(async () => {
    setCargando(true);
    try {
      const [saldoData, ventasData, movimientosData] = await Promise.all([
        getSaldoActual(),
        consultarVentas(fecha),
        getMovimientosPorFecha(fecha)
      ]);

      if (saldoData.success) setSaldo(saldoData.saldo_actual);
      
      if (ventasData.success) {
        setVentas(ventasData.ventas);
        setResumen(ventasData.resumen);
        if (ventasData.ventas.length > 0) {
          await crearSnapshotsDeVentas(ventasData.ventas);
        }
      }
      
      if (movimientosData.success) {
        setMovimientosData(movimientosData);
        const soloGastos = (movimientosData.detalles || []).filter(d => d.tipo === 'gasto');
        console.log('💸 Gastos en cargarTodo:', soloGastos.length);
        setGastos(soloGastos);
        
        if (movimientosData.movimiento_diario) {
          if (movimientosData.movimiento_diario.valor_stock_dia) {
            setValorStock(movimientosData.movimiento_diario.valor_stock_dia);
          }
          if (movimientosData.movimiento_diario.valor_total_empresa) {
            setValorTotalEmpresa(movimientosData.movimiento_diario.valor_total_empresa);
          }
          if (movimientosData.movimiento_diario.productos_con_problemas) {
            setProductosConProblemas(movimientosData.movimiento_diario.productos_con_problemas);
          }
        }
      } else {
        setGastos([]);
      }

      await cargarStockActual();
    } catch (error) {
      console.error('Error cargando datos:', error);
      showError('Error al cargar los datos');
    } finally {
      setCargando(false);
    }
  }, [fecha, cargarStockActual, crearSnapshotsDeVentas]);

  // 🔥 EFFECT PARA CARGAR GASTOS CUANDO CAMBIA LA FECHA
  useEffect(() => {
    cargarGastos();
  }, [cargarGastos]);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  const handleImportarVentas = async () => {
    setImportando(true);
    try {
      const data = await importarDia(fecha);
      if (data.success) {
        showMessage(`✅ Ventas importadas: $${data.total_ganancia.toLocaleString()}`);
        
        if (data.valor_stock_dia) setValorStock(data.valor_stock_dia);
        if (data.valor_total_empresa) setValorTotalEmpresa(data.valor_total_empresa);
        if (data.productos_con_problemas) setProductosConProblemas(data.productos_con_problemas);
        
        await cargarTodo();
        
        if (data.productos_con_problemas?.length > 0) {
          showError(`⚠️ Atención: ${data.productos_con_problemas.length} productos tienen precio de compra = 0. Revisar stock.`);
        }
      } else {
        showError(data.error);
      }
    } catch (error) {
      showError('Error al importar ventas');
    } finally {
      setImportando(false);
    }
  };

  const handleAgregarGasto = () => {
    const monto = parseFloat(montoGasto);
    
    if (isNaN(monto) || monto <= 0) {
      showError('❌ Ingrese un monto válido (mayor a 0)');
      return;
    }
    
    if (!descripcionGasto.trim()) {
      showError('❌ Ingrese una descripción');
      return;
    }
    
    if (descripcionGasto.trim().length < 3) {
      showError('❌ La descripción debe tener al menos 3 caracteres');
      return;
    }
    
    const nuevoGasto = {
      id: Date.now(),
      monto: monto,
      descripcion: descripcionGasto.trim(),
      metodo_pago: metodoPagoGasto || 'efectivo'
    };
    
    setGastosPendientes(prev => [...prev, nuevoGasto]);
    setMontoGasto('');
    setDescripcionGasto('');
    setMostrarPreview(true);
    showMessage(`📋 Gasto agregado: $${monto.toLocaleString()}`);
  };

  // 🔥 FUNCIÓN CORREGIDA - Guarda y recarga GASTOS
  const confirmarGastos = async () => {
    if (gastosPendientes.length === 0) return;
    
    setCargando(true);
    
    // Guardar todos los gastos pendientes
    for (const gasto of gastosPendientes) {
      try {
        await registrarGasto(fecha, gasto.monto, gasto.descripcion, 'Otros');
        console.log(`✅ Gasto guardado: ${gasto.descripcion} - $${gasto.monto}`);
      } catch (error) {
        console.error(`❌ Error guardando gasto:`, error);
        showError(`❌ Falló: ${gasto.descripcion}`);
        setCargando(false);
        return;
      }
    }
    
    // ✅ Limpiar pendientes
    setGastosPendientes([]);
    setMostrarPreview(false);
    
    // 🔥 RECARGAR LOS GASTOS INMEDIATAMENTE
    await cargarGastos();
    
    // También recargar saldo
    const saldoData = await getSaldoActual();
    if (saldoData.success) setSaldo(saldoData.saldo_actual);
    
    showMessage(`✅ ${gastosPendientes.length} gasto(s) guardados`);
    setCargando(false);
  };

  const cancelarGastos = () => {
    setGastosPendientes([]);
    setMostrarPreview(false);
    showMessage('❌ Gastos cancelados');
  };

  const eliminarGastoPendiente = (id) => {
    setGastosPendientes(prev => prev.filter(g => g.id !== id));
    if (gastosPendientes.length === 1) setMostrarPreview(false);
  };

  const descargarPlantillaExcel = () => {
    const plantilla = [
      ['fecha', 'monto', 'descripcion', 'categoria'],
      [fecha, '1500', 'Viáticos', 'Otros'],
      [fecha, '2500', 'Insumos', 'Otros'],
      [fecha, '800', 'Combustible', 'Otros']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(plantilla);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos');
    XLSX.writeFile(wb, 'plantilla_gastos.xlsx');
    showMessage('📥 Plantilla descargada');
  };

  const handleImportarExcel = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const nuevosPendientes = [];
      
      for (const row of rows) {
        const monto = row.monto || row.Monto;
        const descripcion = row.descripcion || row.Descripcion;
        
        if (monto && descripcion && !isNaN(parseFloat(monto))) {
          nuevosPendientes.push({
            id: Date.now() + Math.random(),
            monto: parseFloat(monto),
            descripcion: descripcion.trim(),
            metodo_pago: 'efectivo'
          });
        }
      }
      
      if (nuevosPendientes.length > 0) {
        setGastosPendientes(prev => [...prev, ...nuevosPendientes]);
        setMostrarPreview(true);
        showMessage(`📋 ${nuevosPendientes.length} gastos agregados desde Excel`);
      } else {
        showError('No se encontraron gastos válidos');
      }
      
      event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleExpandirVenta = (ventaId) => {
    setVentaExpandida(prev => prev === ventaId ? null : ventaId);
  };

  return (
    <div className="contable-container">
      <div className="contable-header">
        <h1>💰 Caja Unificada</h1>
        <div className="contable-subtitle">Efectivo + Stock = Valor de la Empresa</div>
      </div>

      {/* Filtros */}
      <div className="filtros-section">
        <div className="filtros-group">
          <div className="filtro-item">
            <label>📅 Fecha</label>
            <input 
              type="date" 
              value={fecha} 
              onChange={(e) => setFecha(e.target.value)} 
              disabled={cargando}
            />
          </div>
          <button className="btn-buscar" onClick={cargarTodo} disabled={cargando}>
            {cargando ? 'Cargando...' : '🔄 Actualizar'}
          </button>
        </div>
      </div>

      {/* Resumen Principal */}
      <div className="resumen-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <ResumenCard label="💰 Saldo Efectivo" value={saldo} color="#10b981" icon="💰" />
        <ResumenCard label="📦 Valor del Stock" value={valorStock} subtext="(valor actual en depósito)" color="#3b82f6" icon="📦" />
        <ResumenCard label="🏢 Valor Total Empresa" value={valorTotalEmpresa} subtext="= Efectivo + Stock" color="#8b5cf6" icon="🏢" />
      </div>

      {/* Resumen Día */}
      <div className="resumen-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: '16px' }}>
        <ResumenCard label="📈 Ganancias del Día" value={gananciasHoy} color="#10b981" icon="📈" />
        <ResumenCard label="💸 Gastos del Día" value={totalGastos} color="#ef4444" icon="💸" />
        <ResumenCard label="📊 Resultado del Día" value={resultadoDia} color={resultadoDia >= 0 ? '#10b981' : '#ef4444'} icon="📊" />
      </div>

      {/* Alertas */}
      <ProductoProblemaAlert productos={productosConProblemas} />

      {/* Preview de Gastos Pendientes */}
      {mostrarPreview && gastosPendientes.length > 0 && (
        <div className="preview-panel">
          <div className="preview-header">
            <h3>📋 Previsualización de Gastos</h3>
            <span className="preview-count">{gastosPendientes.length} gastos</span>
          </div>
          <div className="preview-info">
            📅 Fecha: <strong>{fecha}</strong>
          </div>
          <div className="preview-total">
            Total: ${totalPendientes.toLocaleString()}
          </div>
          <div className="preview-list">
            {gastosPendientes.map(gasto => (
              <div key={gasto.id} className="preview-item">
                <span className="preview-monto">-${gasto.monto.toLocaleString()}</span>
                <span className="preview-desc">{gasto.descripcion}</span>
                <button className="preview-eliminar" onClick={() => eliminarGastoPendiente(gasto.id)}>✖</button>
              </div>
            ))}
          </div>
          <div className="preview-actions">
            <button className="btn-secundario" onClick={cancelarGastos}>Cancelar</button>
            <button className="btn-primario" onClick={confirmarGastos} disabled={cargando}>
              {cargando ? 'Guardando...' : '✅ Confirmar y Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Mensajes */}
      {mensaje.text && (
        <div className={`${mensaje.type === 'error' ? 'error-message' : 'success-message'}`}>
          {mensaje.text}
        </div>
      )}

      {/* Sección Ventas */}
      <div className="seccion">
        <div className="seccion-header">
          <h2>📊 Ventas del Día ({fecha})</h2>
          {resumen?.total_ventas > 0 && (
            <button className="btn-importar" onClick={handleImportarVentas} disabled={importando}>
              {importando ? 'Importando...' : '📥 Importar Ganancias'}
            </button>
          )}
        </div>
        
        {resumen && (
          <div className="resumen-ventas" style={{ padding: '16px 24px', background: '#f8fafc', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <span>📊 Total ventas: <strong>{resumen.total_ventas}</strong></span>
            <span>💰 Monto total: <strong>${resumen.monto_total?.toLocaleString()}</strong></span>
            <span>📉 Costo total: <strong>${resumen.costo_total?.toLocaleString()}</strong></span>
            <span>📈 Ganancia: <strong style={{ color: '#10b981' }}>${resumen.ganancia_total?.toLocaleString()}</strong></span>
            <span>📊 Margen: <strong>{resumen.margen_promedio}%</strong></span>
          </div>
        )}

        {ventas.length > 0 ? (
          <div className="tabla-wrapper">
            <table className="tabla-ventas">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}></th>
                  <th>ID</th>
                  <th>Productos</th>
                  <th>Descuento</th>
                  <th>Total</th>
                  <th>Costo</th>
                  <th>Ganancia</th>
                  <th>Margen</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map(venta => (
                  <VentaDetalle
                    key={venta.id}
                    venta={venta}
                    isExpanded={ventaExpandida === venta.id}
                    onToggle={() => toggleExpandirVenta(venta.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No hay ventas para esta fecha</div>
        )}
      </div>

      {/* Sección Gastos */}
      <div className="seccion">
        <div className="seccion-header">
          <h2>💸 Gastos del Día ({fecha})</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-secundario" onClick={descargarPlantillaExcel}>📥 Plantilla</button>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleImportarExcel} 
              style={{ display: 'none' }} 
              id="excel-input" 
            />
            <label htmlFor="excel-input" className="btn-secundario" style={{ cursor: 'pointer' }}>
              📂 Importar Excel
            </label>
          </div>
        </div>
        
        <div style={{ padding: '20px 24px' }}>
          <div className="filtros-group">
            <div className="filtro-item">
              <label>💰 Monto</label>
              <input 
                type="number" 
                value={montoGasto} 
                onChange={(e) => setMontoGasto(e.target.value)} 
                placeholder="0.00" 
                style={{ width: '150px' }} 
                disabled={cargando}
              />
            </div>
            <div className="filtro-item" style={{ flex: 1 }}>
              <label>📝 Descripción</label>
              <input 
                type="text" 
                value={descripcionGasto} 
                onChange={(e) => setDescripcionGasto(e.target.value)} 
                placeholder="Ej: Viáticos, insumos, etc." 
                disabled={cargando}
              />
            </div>
            <button className="btn-primario" onClick={handleAgregarGasto} disabled={cargando}>
              ➕ Agregar Gasto
            </button>
          </div>
        </div>

        {gastos.length > 0 ? (
          <div className="tabla-wrapper">
            <table className="tabla-ventas">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Monto</th>
                  <th>Descripción</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {gastos.map((gasto, idx) => (
                  <tr key={gasto.id}>
                    <td>{idx + 1}</td>
                    <td style={{ color: '#ef4444', fontWeight: '600' }}>
                      -${parseFloat(gasto.monto).toLocaleString()}
                    </td>
                    <td>{gasto.descripcion || 'Sin descripción'}</td>
                    <td>{gasto.creado_en ? new Date(gasto.creado_en).toLocaleTimeString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold', padding: '12px 16px' }}>
                    Total Gastos: <span style={{ color: '#ef4444' }}>-${totalGastos.toLocaleString()}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="empty-state">No hay gastos registrados para esta fecha</div>
        )}
      </div>

      <style>{`
        .fila-expandida {
          background-color: #f1f5f9;
        }
        .badge-margen {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }
        .badge-margen.alto {
          background-color: #dcfce7;
          color: #166534;
        }
        .badge-margen.medio {
          background-color: #fef3c7;
          color: #92400e;
        }
        .badge-margen.bajo {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .card-icon {
          margin-right: 4px;
        }
        .contable-container {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .filtros-section {
          background: white;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .filtros-group {
          display: flex;
          gap: 16px;
          align-items: flex-end;
        }
        .filtro-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .filtro-item label {
          font-weight: 600;
          font-size: 14px;
        }
        .filtro-item input, .filtro-item select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }
        .btn-buscar, .btn-primario, .btn-secundario, .btn-importar {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-buscar {
          background: #3b82f6;
          color: white;
        }
        .btn-primario {
          background: #10b981;
          color: white;
        }
        .btn-secundario {
          background: #6b7280;
          color: white;
        }
        .btn-importar {
          background: #f59e0b;
          color: white;
        }
        .resumen-grid {
          display: grid;
          gap: 16px;
          margin-bottom: 20px;
        }
        .resumen-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .resumen-card-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }
        .resumen-card-value {
          font-size: 28px;
          font-weight: bold;
        }
        .resumen-card-sub {
          font-size: 12px;
          color: #888;
          margin-top: 4px;
        }
        .seccion {
          background: white;
          border-radius: 12px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .seccion-header {
          padding: 16px 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .seccion-header h2, .seccion-header h3 {
          margin: 0;
        }
        .tabla-wrapper {
          overflow-x: auto;
        }
        .tabla-ventas {
          width: 100%;
          border-collapse: collapse;
        }
        .tabla-ventas th, .tabla-ventas td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .tabla-ventas th {
          background: #f9fafb;
          font-weight: 600;
        }
        .empty-state {
          padding: 40px;
          text-align: center;
          color: #888;
        }
        .preview-panel {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .preview-count {
          background: #f59e0b;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
        }
        .preview-list {
          max-height: 200px;
          overflow-y: auto;
        }
        .preview-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background: white;
          margin-bottom: 4px;
          border-radius: 4px;
        }
        .preview-eliminar {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 2px 8px;
          cursor: pointer;
        }
        .preview-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 12px;
        }
        .success-message {
          background: #d1fae5;
          color: #065f46;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .error-message {
          background: #fee2e2;
          color: #991b1b;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  );
};

export default CajaUnificada;