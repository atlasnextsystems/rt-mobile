// ==========================================
// RT Pintura - Mobile: lançamento de estoque
// ==========================================

// Ajuste esta URL para o endereço público real da sua API
const API_BASE = window.RT_API_BASE || (window.location.origin ? `${window.location.origin}/api` : 'http://localhost:3000/api');

let liveStock = null;   // snapshot mais recente vindo do servidor
let selection = { carId: null, part: null, color: null, qty: 0 };

const el = (id) => document.getElementById(id);

// ---------- Conexão / status ----------
async function refreshStock() {
  try {
    const res = await fetch(`${API_BASE}/stock`);
    if (!res.ok) throw new Error('bad response');
    const data = await res.json();
    liveStock = data.stock;
    if (data.catalog) {
      window.COLORS = data.catalog.COLORS || window.COLORS;
      window.CAR_MODELS = data.catalog.CAR_MODELS || window.CAR_MODELS;
      window.PARTS = data.catalog.PARTS || window.PARTS;
      window.MODEL_PARTS = data.catalog.MODEL_PARTS || window.MODEL_PARTS;
      window.MODEL_PART_COLORS = data.catalog.MODEL_PART_COLORS || window.MODEL_PART_COLORS;
      window.ALL_CARS = data.catalog.ALL_CARS || window.ALL_CARS;
    }
    return liveStock;
  } catch (err) {
    return liveStock; // mantém o último snapshot conhecido
  }
}

// ---------- Passo 1: Carro ----------
function renderCarStep() {
  const grid = el('car-grid');
  grid.innerHTML = '';
  const stockCars = liveStock ? Object.keys(liveStock) : [];
  const cars = Array.from(new Set([...(ALL_CARS || []), ...stockCars]));
  cars.forEach((carId) => {
    const btn = document.createElement('button');
    btn.className = 'm-pill-btn';
    btn.textContent = CAR_MODELS[carId] || carId;
    btn.onclick = () => selectCar(carId);
    grid.appendChild(btn);
  });
}

function selectCar(carId) {
  selection = { carId, part: null, color: null, qty: 0 };
  highlightSelected('car-grid', CAR_MODELS[carId] || carId);
  renderPartStep(carId);
  showStep(2);
}

// ---------- Passo 2: Peça ----------
function renderPartStep(carId) {
  const grid = el('part-grid');
  grid.innerHTML = '';
  let parts = Object.keys((liveStock && liveStock[carId]) || {});
  if (!parts.length && window.MODEL_PARTS && window.MODEL_PARTS[carId]) {
    parts = window.MODEL_PARTS[carId];
  }
  if (!parts.length) {
    grid.innerHTML = '<div class="m-empty-state">Nenhuma peça disponível para este carro.</div>';
    return;
  }
  parts.forEach((partKey) => {
    const btn = document.createElement('button');
    btn.className = 'm-pill-btn';
    btn.textContent = (PARTS[partKey] && PARTS[partKey].label) || partKey;
    btn.onclick = () => selectPart(partKey);
    grid.appendChild(btn);
  });
}

function selectPart(partKey) {
  selection.part = partKey;
  selection.color = null;
  highlightSelected('part-grid', (PARTS[partKey] && PARTS[partKey].label) || partKey);
  renderColorStep(selection.carId, partKey);
  showStep(3);
}

// ---------- Passo 3: Cor ----------
function renderColorStep(carId, partKey) {
  const grid = el('color-grid');
  grid.innerHTML = '';
  let colors = liveStock?.[carId]?.[partKey] ? Object.keys(liveStock[carId][partKey]) : [];
  if (!colors.length && window.MODEL_PART_COLORS && window.MODEL_PART_COLORS[carId]?.[partKey]) {
    colors = window.MODEL_PART_COLORS[carId][partKey];
  }
  if (!colors.length) {
    grid.innerHTML = '<div class="m-empty-state">Nenhuma cor disponível para esta peça.</div>';
    return;
  }
  colors.forEach((colorKey) => {
    const meta = COLORS[colorKey] || { name: colorKey, hex: '#ccc' };
    const btn = document.createElement('button');
    btn.className = 'm-color-btn';
    btn.innerHTML = `
      <div class="m-color-swatch" style="background:${meta.hex}"></div>
      <div class="m-color-code">${colorKey}</div>
      <div class="m-color-name">${meta.name}</div>
    `;
    btn.onclick = (event) => selectColor(colorKey, event);
    grid.appendChild(btn);
  });
}

function selectColor(colorKey, event) {
  selection.color = colorKey;
  selection.qty = 0;
  [...el('color-grid').children].forEach((c) => c.classList.remove('selected'));
  if (event?.currentTarget) {
    event.currentTarget.classList.add('selected');
  }
  updateQtyStep();
  showStep(4);
}

// ---------- Passo 4: Quantidade + ação ----------
function updateQtyStep() {
  const { carId, part, color, qty } = selection;
  const meta = COLORS[color] || { name: color };
  const partLabel = (PARTS[part] && PARTS[part].label) || part;
  el('selection-summary').innerHTML =
    `<b>${CAR_MODELS[carId] || carId}</b> · <b>${partLabel}</b> · <b>${color}</b> (${meta.name})`;
  el('qty-value').textContent = qty;
  const current = liveStock?.[carId]?.[part]?.[color];
  if (typeof current === 'number') {
    el('current-stock-display').innerHTML = `Estoque atual: <b>${current}</b> peça(s)`;
    el('btn-remove').disabled = current < qty || qty === 0;
  } else {
    el('current-stock-display').innerHTML = 'Estoque atual: <b>não disponível</b>';
    el('btn-remove').disabled = true;
  }
}

function setQty(value) {
  selection.qty = Math.max(0, Math.min(999, value));
  updateQtyStep();
}

function bindUiActions() {
  // Configuração dos botões de quantidade de ajuste rápido
  el('qty-minus-5').onclick = () => setQty(selection.qty - 5);
  el('qty-minus-1').onclick = () => setQty(selection.qty - 1);
  el('qty-plus-1').onclick = () => setQty(selection.qty + 1);
  el('qty-plus-5').onclick = () => setQty(selection.qty + 5);

  document.querySelectorAll('.m-back-btn').forEach((btn) => {
    btn.onclick = () => {
      const targetStep = Number(btn.dataset.backStep || 1);
      if (targetStep === 1) {
        selection = { carId: selection.carId, part: null, color: null, qty: 0 };
      } else if (targetStep === 2) {
        selection.color = null;
        selection.qty = 0;
      } else if (targetStep === 3) {
        selection.qty = 0;
      }
      showStep(targetStep);
    };
  });

  const keypad = el('qty-keypad');
  if (keypad) {
    keypad.addEventListener('click', (event) => {
      const key = event.target.closest('button')?.dataset?.key;
      if (!key) return;
      if (key === 'clear') {
        setQty(0);
        return;
      }
      if (key === 'back') {
        const current = String(selection.qty);
        const updated = current.length > 1 ? current.slice(0, -1) : '0';
        setQty(parseInt(updated, 10));
        return;
      }
      setQty(parseInt(String(selection.qty) + key, 10));
    });
  }

  const btnAdd = el('btn-add');
  if (btnAdd) btnAdd.onclick = () => submitMovement('add');
  const btnRemove = el('btn-remove');
  if (btnRemove) btnRemove.onclick = () => submitMovement('remove');

  const btnRestart = el('btn-restart');
  if (btnRestart) {
    btnRestart.onclick = () => {
      selection = { carId: null, part: null, color: null, qty: 0 };
      showStep(1);
      [...(el('car-grid')?.children || [])].forEach((c) => c.classList.remove('selected'));
      [...(el('part-grid')?.children || [])].forEach((c) => c.classList.remove('selected'));
      [...(el('color-grid')?.children || [])].forEach((c) => c.classList.remove('selected'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }
}

// Negação de cliques futuros do stepper ou navegação de volta livre
function setupStepperNavigation() {
  document.querySelectorAll('.m-step-item').forEach((item) => {
    item.style.cursor = 'pointer';
    item.onclick = () => {
      const step = +item.dataset.step;
      if (step === 1) {
        selection.part = null;
        selection.color = null;
        selection.qty = 0;
        showStep(1);
      } else if (step === 2 && selection.carId) {
        selection.color = null;
        selection.qty = 0;
        showStep(2);
      } else if (step === 3 && selection.carId && selection.part) {
        selection.qty = 0;
        showStep(3);
      } else if (step === 4 && selection.carId && selection.part && selection.color) {
        showStep(4);
      }
    };
  });
}

// ---------- Envio ----------
async function submitMovement(type) {
  const { carId, part, color, qty } = selection;
  
  if (qty <= 0) {
    showToast('A quantidade deve ser maior que 0 para realizar movimentações.', 'error');
    return;
  }

  const operator = getOperatorName();

  try {
    const res = await fetch(`${API_BASE}/movement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carId, part, color, quantity: qty, type, operator })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Erro ao registrar movimentação', 'error');
      return;
    }

    liveStock[carId][part][color] = data.newStock;
    showToast(
      type === 'add' ? `+${qty} adicionado(s) com sucesso!` : `-${qty} retirado(s) com sucesso!`,
      'success'
    );
    updateQtyStep();
    loadHistory();
  } catch (err) {
    showToast('Sem conexão com o servidor. Tente novamente.', 'error');
  }
}

function getOperatorName() {
  let name = localStorage.getItem('rt_operator_name');
  if (!name) {
    name = prompt('Digite seu nome ou matrícula (fica salvo neste celular):') || 'operador';
    localStorage.setItem('rt_operator_name', name);
  }
  return name;
}

// ---------- Histórico ----------
async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/movements?limit=10`);
    const movements = await res.json();
    const list = el('history-list');
    if (!movements.length) {
      list.innerHTML = '<div class="m-history-empty">Nenhuma movimentação ainda.</div>';
      return;
    }
    list.innerHTML = movements.map((m) => {
      const partLabel = (PARTS[m.part] && PARTS[m.part].label) || m.part;
      const time = new Date(m.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      return `
        <div class="m-history-item ${m.type}">
          <div>
            <div class="m-hist-main">${m.type === 'add' ? '+' : '-'}${m.quantity} · ${CAR_MODELS[m.carId]} · ${partLabel} · ${m.color}</div>
            <div class="m-hist-time">${m.operator} · ${time}</div>
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    // silencioso - histórico é secundário
  }
}

// ---------- Utilitário de seleção visual ----------
function highlightSelected(gridId, label) {
  [...el(gridId).children].forEach((btn) => {
    btn.classList.toggle('selected', btn.textContent === label);
  });
}

// ---------- Toast ----------
let toastTimer;
function showToast(message, type) {
  const t = el('m-toast');
  t.textContent = message;
  t.className = 'm-toast show ' + (type || '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

function updateStepper(step) {
  [...document.querySelectorAll('.m-step-item')].forEach((item) => {
    item.classList.toggle('active', +item.dataset.step === step);
  });
}

function showStep(step) {
  const steps = [1, 2, 3, 4];
  steps.forEach((n) => {
    const elStep = el('step-' + (n === 1 ? 'car' : n === 2 ? 'part' : n === 3 ? 'color' : 'qty'));
    if (!elStep) return;
    elStep.classList.toggle('m-step-visible', n === step);
    elStep.classList.toggle('m-step-hidden', n !== step);
  });
  updateStepper(step);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- Inicialização ----------
async function init() {
  await refreshStock();
  renderCarStep();
  loadHistory();
  bindUiActions();
  setupStepperNavigation();
  showStep(1);
  setInterval(refreshStock, 15000); // mantém o estoque atualizado em segundo plano
}

init();
