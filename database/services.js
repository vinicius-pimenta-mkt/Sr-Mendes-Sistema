export const SERVICES_PRICES = {
  "Sobrancelha": 1500,
  "Selagem": 6500, // A partir de, usar o valor mínimo
  "Relaxamento": 4500, // A partir de, usar o valor mínimo
  "Pigmentação": 3000,
  "Acabamento (Pezinho)": 2500,
  "Luzes": 10000,
  "Limpeza de pele": 4000,
  "Hidratação": 4000,
  "Finalização penteado": 2500,
  "CORTE + SOBRANCELHA": 6000,
  "Corte Masculino": 4500,
  "Raspar na maquina": 3500,
  "Corte infantil no carrinho": 5000,
  "corte infantil": 5000,
  "CORTE + BARBA SIMPLES": 8000,
  "COMBO CORTE + BARBOTERAPIA": 9000,
  "COMBO CORTE + BARBA + SOBRANCELHA": 9000,
  "Coloração": 3500,
  "Barboterapia": 5000,
  "Barba Simples": 4000,
  "Tratamento V.O": 9000
};

export const getServicePrice = (serviceName) => {
  // Retorna o preço em centavos
  return SERVICES_PRICES[serviceName] || 0;
};
