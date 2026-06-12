import { useEffect, useState } from 'react';
import { getSaldoCajas } from '../api/pagosApi';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    const d = await getSaldoCajas();
    setData(d);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const fmt = (n) => '$' + parseFloat(n).toLocaleString('es-AR', { minimumFractionDigits: 2 });

  if (loading) return <p className="muted">Cargando...</p>;
  if (!data?.success) return <p className="error">Error al cargar saldos.</p>;

  return (
    <div>
      <div className="grid-4">
        <div className="metric">
          <div className="label">Caja efectivo</div>
          <div className="value green">{fmt(data.caja_efectivo)}</div>
        </div>
        <div className="metric">
          <div className="label">Caja transferencia</div>
          <div className="value blue">{fmt(data.caja_transferencia)}</div>
        </div>
        <div className="metric">
          <div className="label">Valor stock</div>
          <div className="value">{fmt(data.valor_stock)}</div>
        </div>
        <div className="metric">
          <div className="label">Total empresa</div>
          <div className="value">{fmt(data.valor_total_empresa)}</div>
        </div>
      </div>

      {data.productos_con_problemas?.length > 0 && (
        <div className="msg info">
          ⚠️ {data.productos_con_problemas.length} producto(s) con precio de compra en 0:{' '}
          {data.productos_con_problemas.slice(0, 3).join(', ')}
          {data.productos_con_problemas.length > 3 ? '...' : ''}
        </div>
      )}

      <button className="btn" onClick={cargar} style={{ marginTop: '1rem' }}>↺ Actualizar</button>
    </div>
  );
}