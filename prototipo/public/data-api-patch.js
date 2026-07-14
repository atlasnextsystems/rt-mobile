// ==========================================
// PATCH: troque as funções fake do data.js por estas.
// Faça o rt-scan (app.js) chamar fetchCurrentStock() em loop
// (ex: setInterval a cada 5-15s) para refletir o que o mobile lançou.
// ==========================================

const API_BASE = window.RT_API_BASE || 'http://localhost:3000/api';

async function fetchCurrentStock() {
  const res = await fetch(`${API_BASE}/stock`);
  const data = await res.json();
  currentStock = data.stock;
  CONSUMPTION_RATE = data.rates;
  TIME_SCALE_HOURS = data.timeScaleHours;
  return currentStock;
}

async function saveStockToBackend(modelId, partKey, colorKey, quantity) {
  const current = currentStock[modelId][partKey][colorKey];
  const diff = quantity - current;
  if (diff === 0) return true;

  const res = await fetch(`${API_BASE}/movement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      carId: modelId,
      part: partKey,
      color: colorKey,
      quantity: Math.abs(diff),
      type: diff > 0 ? 'add' : 'remove',
      operator: 'painel-admin-tv'
    })
  });
  const data = await res.json();
  if (res.ok) currentStock[modelId][partKey][colorKey] = data.newStock;
  return res.ok;
}

async function fetchConsumptionRates() {
  const res = await fetch(`${API_BASE}/stock`);
  const data = await res.json();
  CONSUMPTION_RATE = data.rates;
  return CONSUMPTION_RATE;
}

async function updateConsumptionRate(colorKey, rate) {
  const res = await fetch(`${API_BASE}/rates`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rates: { [colorKey]: rate } })
  });
  return res.ok;
}

async function resetStockOnBackend() {
  const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
  const data = await res.json();
  if (res.ok) currentStock = data.stock;
  return currentStock;
}
