// src/api/pagosApi.js

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/pagos/api';

const get = async (url) => {
  const r = await fetch(`${BASE}${url}`);
  return r.json();
};

const post = async (url, body) => {
  const r = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
};
export const reportarDeudor = (body) => post('/reportar-deudor/', body);
export const getSaldoCajas = () => get('/saldo-cajas/');
export const getDetalleCierre = (fecha) => get(`/detalle-cierre/?fecha=${fecha}`);
export const procesarCierre = (body) => post('/procesar-cierre/', body);
export const registrarMovimientoExtra = (body) => post('/movimiento-extra/', body);
export const getDeudores = (estado = 'pendiente') => get(`/deudores/?estado=${estado}`);
export const registrarPagoDeudor = (body) => post('/deudores/pago/', body);
export const reportarDeudorDesdeCierre = (body) => post('/reportar-deudor-cierre/', body);
export const registrarDeudorManual = (body) => post('/deudores/registrar/', body);

// ✅ Función CORREGIDA - recibe UNA SOLA fecha
export const getHistorialCierres = (fecha) => {
  if (!fecha) {
    console.error('getHistorialCierres: fecha es requerida');
    return Promise.resolve({ success: false, error: 'Fecha no proporcionada' });
  }
  return get(`/historial-cierres/?fecha=${fecha}`);
};