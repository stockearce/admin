// components/GastosDiarios.jsx
import React, { useState, useEffect } from 'react';
import { getGastosHoy, registrarGastosMasivos, consultarCajaPorFecha } from '../api/ventas';
import '../App.css';

function GastosDiarios() {
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [gastos, setGastos] = useState([]);
    const [caja, setCaja] = useState(null);
    const [cargando, setCargando] = useState(false);
    
    // Formulario nuevo gasto
    const [monto, setMonto] = useState('');
    const [categoria, setCategoria] = useState('Viáticos');
    const [descripcion, setDescripcion] = useState('');
    
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    const categorias = [
        '🚗 Viáticos',
        '📦 Insumos',
        '🔧 Reparaciones',
        '💡 Servicios (luz, agua, internet)',
        '📢 Marketing/Publicidad',
        '👥 Sueldos',
        '🏛️ Impuestos',
        '📝 Otros'
    ];

    const cargarDatos = async () => {
        setCargando(true);
        setError('');
        
        // Cargar información de la caja
        const cajaData = await consultarCajaPorFecha(fecha);
        if (cajaData.success) {
            setCaja(cajaData.caja);
        } else {
            setCaja(null);
        }
        
        // Cargar gastos existentes
        const gastosData = await getGastosHoy(fecha);
        if (gastosData.success && gastosData.gastos) {
            const gastosFormateados = gastosData.gastos.map(g => ({
                id: g.id,
                monto: parseFloat(g.monto),
                descripcion: g.descripcion,
                categoria: extraerCategoria(g.descripcion),
                descripcionLimpia: limpiarDescripcion(g.descripcion),
                creado_en: g.creado_en
            }));
            setGastos(gastosFormateados);
        } else {
            setGastos([]);
        }
        
        setCargando(false);
    };

    const extraerCategoria = (descripcion) => {
        if (descripcion.startsWith('[')) {
            const categoria = descripcion.split(']')[0].substring(1);
            return categoria;
        }
        return 'Otros';
    };

    const limpiarDescripcion = (descripcion) => {
        if (descripcion.startsWith('[')) {
            return descripcion.split(']')[1].trim();
        }
        return descripcion;
    };

    useEffect(() => {
        cargarDatos();
    }, [fecha]);

    const agregarGasto = () => {
        const montoNum = parseFloat(monto);
        
        if (isNaN(montoNum) || montoNum <= 0) {
            setError('Ingrese un monto válido');
            return;
        }
        
        if (!descripcion.trim()) {
            setError('Ingrese una descripción');
            return;
        }
        
        const nuevoGasto = {
            id: Date.now(), // ID temporal
            monto: montoNum,
            categoria: categoria,
            descripcionLimpia: descripcion,
            descripcion: `[${categoria}] ${descripcion}`,
            temporal: true
        };
        
        setGastos([...gastos, nuevoGasto]);
        
        // Limpiar formulario
        setMonto('');
        setDescripcion('');
        setError('');
        setMensaje(`Gasto agregado: $${montoNum.toLocaleString()}`);
        
        setTimeout(() => setMensaje(''), 3000);
    };

    const eliminarGastoLocal = (index) => {
        const nuevosGastos = [...gastos];
        nuevosGastos.splice(index, 1);
        setGastos(nuevosGastos);
        setMensaje('Gasto eliminado localmente');
        setTimeout(() => setMensaje(''), 3000);
    };

    const guardarGastos = async () => {
        const gastosPendientes = gastos.filter(g => g.temporal);
        
        if (gastosPendientes.length === 0) {
            setError('No hay gastos nuevos para guardar');
            return;
        }
        
        const total = gastosPendientes.reduce((sum, g) => sum + g.monto, 0);
        
        if (!window.confirm(`¿Guardar ${gastosPendientes.length} gastos por $${total.toLocaleString()}?`)) {
            return;
        }
        
        setCargando(true);
        
        const gastosData = gastosPendientes.map(g => ({
            monto: g.monto,
            descripcion: `[${g.categoria}] ${g.descripcionLimpia}`
        }));
        
        const result = await registrarGastosMasivos(fecha, gastosData);
        
        if (result.success) {
            setMensaje(`✅ ${result.mensaje} - Saldo final: $${result.saldo_final.toLocaleString()}`);
            // Recargar datos para obtener los IDs reales
            await cargarDatos();
        } else {
            setError(`❌ Error: ${result.error}`);
        }
        
        setCargando(false);
        setTimeout(() => setMensaje(''), 4000);
    };

    const cambiarFecha = (dias) => {
        const nuevaFecha = new Date(fecha);
        nuevaFecha.setDate(nuevaFecha.getDate() + dias);
        const año = nuevaFecha.getFullYear();
        const mes = String(nuevaFecha.getMonth() + 1).padStart(2, '0');
        const dia = String(nuevaFecha.getDate()).padStart(2, '0');
        setFecha(`${año}-${mes}-${dia}`);
    };

    const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);

    return (
        <div className="contable-container">
            <div className="contable-header">
                <h1>💰 Registro de Gastos Diarios</h1>
                <div className="contable-subtitle">
                    Gastos = Viáticos + Insumos + Servicios + ...
                </div>
            </div>

            {/* Selector de fecha */}
            <div className="filtros-section">
                <div className="filtros-group">
                    <button className="btn-nav" onClick={() => cambiarFecha(-1)}>◀ Anterior</button>
                    <div className="filtro-item">
                        <label>📅 Fecha</label>
                        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                    </div>
                    <button className="btn-nav" onClick={() => cambiarFecha(1)}>Siguiente ▶</button>
                    <button className="btn-buscar" onClick={cargarDatos} disabled={cargando}>
                        {cargando ? 'Cargando...' : '🔄 Actualizar'}
                    </button>
                </div>
            </div>

            {/* Tarjetas de resumen */}
            {caja && (
                <div className="resumen-grid">
                    <div className="resumen-card">
                        <div className="resumen-card-label">Saldo Inicial</div>
                        <div className="resumen-card-value">${caja.saldo_inicial?.toLocaleString()}</div>
                    </div>
                    <div className="resumen-card">
                        <div className="resumen-card-label">Ganancias del Día</div>
                        <div className="resumen-card-value monto">${caja.total_ingresos?.toLocaleString()}</div>
                    </div>
                    <div className="resumen-card">
                        <div className="resumen-card-label">Gastos del Día</div>
                        <div className="resumen-card-value costo">${caja.total_egresos?.toLocaleString()}</div>
                    </div>
                    <div className="resumen-card">
                        <div className="resumen-card-label">💰 Saldo Final</div>
                        <div className="resumen-card-value ganancia">${caja.saldo_final?.toLocaleString()}</div>
                    </div>
                </div>
            )}

            {!caja && !cargando && (
                <div className="empty-state">
                    <div className="empty-state-icon">⚠️</div>
                    <div className="empty-state-text">
                        Primero importá las ventas de este día en la pestaña "Ventas"
                    </div>
                </div>
            )}

            {/* Formulario para agregar gasto */}
            {caja && (
                <>
                    <div className="filtros-section">
                        <h3>➕ Registrar Nuevo Gasto</h3>
                        <div className="filtros-group">
                            <div className="filtro-item">
                                <label>💰 Monto</label>
                                <input 
                                    type="number" 
                                    value={monto} 
                                    onChange={(e) => setMonto(e.target.value)}
                                    placeholder="0.00"
                                    className="form-control"
                                />
                            </div>
                            <div className="filtro-item">
                                <label>📂 Categoría</label>
                                <select 
                                    value={categoria} 
                                    onChange={(e) => setCategoria(e.target.value)}
                                    className="form-control"
                                >
                                    {categorias.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="filtro-item" style={{ flex: 2 }}>
                                <label>📝 Descripción</label>
                                <input 
                                    type="text" 
                                    value={descripcion} 
                                    onChange={(e) => setDescripcion(e.target.value)}
                                    placeholder="Ej: Combustible, útiles de oficina, etc."
                                    className="form-control"
                                />
                            </div>
                            <button className="btn-buscar" onClick={agregarGasto}>
                                ➕ Agregar
                            </button>
                        </div>
                    </div>

                    {error && <div className="error-message">{error}</div>}
                    {mensaje && <div className="success-message">{mensaje}</div>}

                    {/* Lista de gastos */}
                    <div className="tabla-wrapper">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3>📋 Lista de Gastos</h3>
                            <div>
                                <button 
                                    className="btn-importar" 
                                    onClick={() => setGastos([])}
                                    style={{ backgroundColor: '#dc3545', marginRight: '10px' }}
                                >
                                    🗑️ Limpiar Todo
                                </button>
                                <button 
                                    className="btn-importar" 
                                    onClick={guardarGastos}
                                    disabled={cargando}
                                >
                                    💾 Guardar en Caja
                                </button>
                            </div>
                        </div>
                        
                        <table className="tabla-ventas">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Monto</th>
                                    <th>Categoría</th>
                                    <th>Descripción</th>
                                    <th>Hora</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gastos.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center">No hay gastos registrados</td>
                                    </tr>
                                ) : (
                                    gastos.map((gasto, index) => (
                                        <tr key={gasto.id}>
                                            <td>{index + 1}</td>
                                            <td className="text-right" style={{ color: '#dc3545', fontWeight: 'bold' }}>
                                                -${gasto.monto.toLocaleString()}
                                            </td>
                                            <td>
                                                <span className={`badge-margen ${gasto.categoria.includes('Viáticos') ? 'alto' : 'medio'}`}>
                                                    {gasto.categoria}
                                                </span>
                                            </td>
                                            <td>{gasto.descripcionLimpia || gasto.descripcion}</td>
                                            <td style={{ fontSize: '0.8rem', color: '#666' }}>
                                                {gasto.creado_en ? new Date(gasto.creado_en).toLocaleTimeString() : 'Pendiente'}
                                            </td>
                                            <td>
                                                <button 
                                                    className="btn-eliminar"
                                                    onClick={() => eliminarGastoLocal(index)}
                                                    style={{
                                                        background: '#dc3545',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '5px 10px',
                                                        borderRadius: '5px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {gastos.length > 0 && (
                                <tfoot>
                                    <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                                        <td colSpan="5" className="text-right">Total Gastos:</td>
                                        <td className="text-right" style={{ color: '#dc3545' }}>
                                            -${totalGastos.toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

export default GastosDiarios;