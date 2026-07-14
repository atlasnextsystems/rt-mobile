// Dados de catálogo usados pela interface mobile.
window.COLORS = {
  '040': { name: 'Branco', hex: '#FFFFFF', code: '040' },
  '089': { name: 'Pérola', hex: '#ca886aff', code: '089' },
  '215': { name: 'Preto', hex: '#111215', code: '215' },
  '1H6': { name: 'Prata', hex: '#C0C2C3', code: '1H6' },
  '1G3': { name: 'Cinza', hex: '#4E5154', code: '1G3' },
  '3R3': { name: 'Vermelho', hex: '#991B1B', code: '3R3' },
  '8X8': { name: 'Azul', hex: '#1D4ED8', code: '8X8' },
  '8X2': { name: 'Azul', hex: '#1D4ED8', code: '8X2' },
  '8V5': { name: 'Azul', hex: '#1D4ED8', code: '8V5' }
};

window.CAR_MODELS = {
  '397': 'SUV 397',
  '063': 'SUV 063',
  'd90': 'SUV D90',
  '535': 'Yaris 535'
};

window.PARTS = {
  FR: { name: 'Bar FR (Bumper Bar Front)', label: 'FR' },
  SP: { name: 'SP (Side Panel)', label: 'SP' },
  RR_RH: { name: 'RR - RH (Rear, Right Hand)', label: 'RR - RH' },
  RR_LH: { name: 'RR - LH (Rear, Left Hand)', label: 'RR - LH' },
  BAR_RR: { name: 'BAR - RR (Bumper Bar Rear)', label: 'BAR - RR' },
  HB: { name: 'HB (Hatchback Rear)', label: 'HB' }
};

window.MODEL_PARTS = {
  '397': ['FR', 'SP', 'RR_LH', 'RR_RH', 'BAR_RR'],
  '063': ['FR'],
  'd90': ['FR', 'RR_LH', 'RR_RH'],
  '535': ['FR', 'HB']
};

window.MODEL_PART_COLORS = {
  '397': {
    FR: ['1H6', '1G3', '3R3', '215', '089', '040', '8X8'],
    SP: ['1H6', '1G3', '3R3', '215', '089', '040', '8X8'],
    RR_LH: ['1H6', '1G3', '3R3', '215', '089', '040', '8X8'],
    RR_RH: ['1H6', '1G3', '3R3', '215', '089', '040', '8X8'],
    BAR_RR: ['1H6', '1G3', '3R3', '215', '089', '040', '8X8']
  },
  '063': {
    FR: ['3R3', '215', '089']
  },
  'd90': {
    FR: ['040', '089', '215', '1H6', '1G3', '3R3', '8X2'],
    RR_LH: ['040', '089', '215', '1H6', '1G3', '3R3', '8X2'],
    RR_RH: ['040', '089', '215', '1H6', '1G3', '3R3', '8X2']
  },
  '535': {
    FR: ['040', '089', '215', '1H6', '1G3', '3R3', '8V5'],
    HB: ['040', '089', '215', '1H6', '1G3', '3R3', '8V5']
  }
};

window.ALL_CARS = ['397', '063', 'd90', '535'];
