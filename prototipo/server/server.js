/**
 * RT Pintura Plástica - API de Estoque
 * ---------------------------------------------------
 * Backend simples em Express que serve como fonte única
 * de verdade do estoque. Tanto o rt-scan (TV) quanto a
 * página mobile falam com essa API.
 *
 * Persistência: arquivo JSON em disco (fácil trocar depois
 * por Postgres/Mongo/etc, a interface dos endpoints não muda).
 *
 * Como rodar:
 *   cd server
 *   npm install
 *   node server.js
 *   -> API sobe em http://localhost:3000
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'stock.json');
const CATALOG_FILE = path.join(__dirname, 'data', 'catalog.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function loadCatalog() {
  if (fs.existsSync(CATALOG_FILE)) {
    return JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'));
  }
  return {};
}
const catalog = loadCatalog();

app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

const RTSCAN_DIR = path.join(__dirname, '..', '..', '..', 'RT Scan', 'prototipo');
app.use('/rt-scan', express.static(RTSCAN_DIR));

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'mobile.html'));
});

// ---------------------------------------------------
// Dados iniciais (mesma estrutura que já existia no data.js)
// ---------------------------------------------------
const INITIAL_STOCK = {
  '397': {
    FR: { '1H6': 1, '1G3': 1, '3R3': 1, '215': 1, '089': 1, '040': 1, '8X8': 1 },
    BAR_FR: { '1H6': 1, '1G3': 1, '3R3': 1, '215': 1, '089': 1, '040': 1, '8X8': 1 },
    RR_LH: { '1H6': 1, '1G3': 1, '3R3': 1, '215': 1, '089': 1, '040': 1, '8X8': 1 },
    RR_RH: { '1H6': 1, '1G3': 1, '3R3': 1, '215': 1, '089': 1, '040': 1, '8X8': 1 },
    BAR_RR: { '1H6': 1, '1G3': 1, '3R3': 1, '215': 1, '089': 1, '040': 1, '8X8': 1 }
  },
  '063': {
    FR: { '3R3': 1, '215': 1, '089': 1 }
  },
  d90: {
    FR: { '040': 5, '089': 2, '215': 8, '1H6': 10, '1G3': 4, '3R3': 2, '8X2': 3 },
    RR_LH: { '040': 4, '089': 2, '215': 7, '1H6': 9, '1G3': 3, '3R3': 1, '8X2': 2 },
    RR_RH: { '040': 4, '089': 2, '215': 7, '1H6': 9, '1G3': 3, '3R3': 1, '8X2': 2 }
  },
  535: {
    FR: { '040': 12, '089': 0, '215': 5, '1H6': 8, '1G3': 6, '3R3': 4, '8V5': 1 },
    HB: { '040': 9, '089': 0, '215': 4, '1H6': 7, '1G3': 5, '3R3': 3, '8V5': 1 }
  }
};

const DEFAULT_RATES = {
  '040': 2.0, '089': 1.5, '215': 3.0, '1H6': 2.5,
  '1G3': 1.0, '3R3': 0.5, '8X8': 1.0, '8X2': 1.0, '8V5': 1.0
};

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      stock: INITIAL_STOCK,
      rates: DEFAULT_RATES,
      targets: {}, // metas por carro+peça+cor: { carId: { partKey: { colorKey: int } } }
      timeScaleHours: 8,
      movements: [] // histórico de entradas/saídas
    };
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  // Garante retrocompatibilidade
  if (!data.targets) data.targets = {};
  return data;
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

let db = loadDB();

function ensureStockSchema(db) {
  const expectedModels = {
    '063': {
      FR: { '215': 0, '040': 0, '089': 0, '1H6': 0, '1G3': 0, '3R3': 0, '8X8': 0 }
    },
    '397': {
      BAR_FR: { '1H6': 0, '1G3': 0, '3R3': 0, '215': 0, '089': 0, '040': 0, '8X8': 0 }
    }
  };
  let changed = false;

  Object.entries(expectedModels).forEach(([carId, parts]) => {
    if (!db.stock[carId]) {
      db.stock[carId] = JSON.parse(JSON.stringify(parts));
      changed = true;
      return;
    }
    Object.entries(parts).forEach(([partKey, colors]) => {
      if (!db.stock[carId][partKey]) {
        db.stock[carId][partKey] = JSON.parse(JSON.stringify(colors));
        changed = true;
      }
    });
  });

  if (changed) saveDB(db);
}

ensureStockSchema(db);

// ---------------------------------------------------
// GET /api/stock -> estoque completo (rt-scan e mobile usam isso)
// ---------------------------------------------------
app.get('/api/stock', (req, res) => {
  res.json({ stock: db.stock, rates: db.rates, targets: db.targets, timeScaleHours: db.timeScaleHours, catalog });
});

// ---------------------------------------------------
// PUT /api/stock -> atualizar o estoque completo/parcial diretamente
// body: { stock: { carId: { partKey: { colorKey: int } } } }
// ---------------------------------------------------
app.put('/api/stock', (req, res) => {
  const { stock } = req.body;
  if (!stock || typeof stock !== 'object') {
    return res.status(400).json({ error: 'stock deve ser um objeto' });
  }
  // Deep merge/update
  Object.keys(stock).forEach(carId => {
    if (!db.stock[carId]) db.stock[carId] = {};
    Object.keys(stock[carId]).forEach(partKey => {
      if (!db.stock[carId][partKey]) db.stock[carId][partKey] = {};
      Object.keys(stock[carId][partKey]).forEach(colorKey => {
        const val = parseInt(stock[carId][partKey][colorKey], 10);
        if (!isNaN(val) && val >= 0) {
          db.stock[carId][partKey][colorKey] = val;
        }
      });
    });
  });
  saveDB(db);
  res.json({ stock: db.stock });
});

// ---------------------------------------------------
// GET /api/catalog -> catálogo completo de carros, peças e cores
// ---------------------------------------------------
app.get('/api/catalog', (req, res) => {
  res.json(catalog);
});

// ---------------------------------------------------
// PUT /api/targets -> salvar metas de produção por carro+peça+cor
// body: { targets: { carId: { partKey: { colorKey: int } } } }
// ---------------------------------------------------
app.put('/api/targets', (req, res) => {
  const { targets } = req.body;
  if (!targets || typeof targets !== 'object') {
    return res.status(400).json({ error: 'targets deve ser um objeto' });
  }
  // Deep merge
  Object.keys(targets).forEach(carId => {
    if (!db.targets[carId]) db.targets[carId] = {};
    Object.keys(targets[carId]).forEach(partKey => {
      if (!db.targets[carId][partKey]) db.targets[carId][partKey] = {};
      Object.assign(db.targets[carId][partKey], targets[carId][partKey]);
    });
  });
  saveDB(db);
  res.json({ targets: db.targets });
});

// ---------------------------------------------------
// GET /api/movements -> últimas movimentações (pra tela mobile mostrar histórico)
// ---------------------------------------------------
app.get('/api/movements', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json(db.movements.slice(-limit).reverse());
});

// ---------------------------------------------------
// POST /api/movement -> adicionar ou retirar peças
// body: { carId, part, color, quantity, type: 'add' | 'remove', operator }
// ---------------------------------------------------
app.post('/api/movement', (req, res) => {
  const { carId, part, color, quantity, type, operator } = req.body;

  if (!carId || !part || !color || !quantity || !type) {
    return res.status(400).json({ error: 'Campos obrigatórios: carId, part, color, quantity, type' });
  }
  if (!db.stock[carId] || !db.stock[carId][part] || !(color in db.stock[carId][part])) {
    return res.status(404).json({ error: 'Carro/peça/cor não encontrados' });
  }
  if (!['add', 'remove'].includes(type)) {
    return res.status(400).json({ error: "type deve ser 'add' ou 'remove'" });
  }
  const qty = Math.abs(parseInt(quantity));
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'quantity inválida' });
  }

  const current = db.stock[carId][part][color];
  const newValue = type === 'add' ? current + qty : current - qty;

  if (newValue < 0) {
    return res.status(400).json({ error: 'Estoque não pode ficar negativo', currentStock: current });
  }

  db.stock[carId][part][color] = newValue;

  const movement = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    carId, part, color, type, quantity: qty,
    previousStock: current,
    newStock: newValue,
    operator: operator || 'desconhecido'
  };
  db.movements.push(movement);
  saveDB(db);

  res.json({ success: true, movement, newStock: newValue });
});

// ---------------------------------------------------
// PUT /api/rates -> atualizar taxas de consumo / escala de tempo
// ---------------------------------------------------
app.put('/api/rates', (req, res) => {
  const { rates, timeScaleHours } = req.body;
  if (rates) db.rates = { ...db.rates, ...rates };
  if (timeScaleHours) db.timeScaleHours = timeScaleHours;
  saveDB(db);
  res.json({ rates: db.rates, timeScaleHours: db.timeScaleHours });
});

// ---------------------------------------------------
// POST /api/reset -> reset de fábrica
// ---------------------------------------------------
app.post('/api/reset', (req, res) => {
  db.stock = JSON.parse(JSON.stringify(INITIAL_STOCK));
  db.rates = { ...DEFAULT_RATES };
  db.timeScaleHours = 8;
  saveDB(db);
  res.json({ success: true, stock: db.stock });
});

app.listen(PORT, () => {
  console.log(`RT Pintura API rodando em http://localhost:${PORT}`);
});
