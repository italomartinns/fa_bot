// Detecta se está em desenvolvimento ou produção
const isDevelopment = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

const API_BASE_URL = isDevelopment 
  ? "http://localhost:3000" 
  : (window.API_URL || window.location.origin); // Usa API_URL se definida, senão usa origin


if (isDevelopment) {
  console.log("[API Config] Modo desenvolvimento - API:", API_BASE_URL);
} else {
  console.log("[API Config] Modo produção - API:", API_BASE_URL);
}

/**
 * Função auxiliar para construir URLs de API
 * @param {string} path - Caminho da rota (ex: "/api/login")
 * @returns {string} URL completa da API
 */

function getApiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

// Exporta para uso global
window.API_CONFIG = {
  BASE_URL: API_BASE_URL,
  isDevelopment,
  getApiUrl
};
