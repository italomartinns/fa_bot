/**
 * Configuração centralizada para URLs da API
 * 
 * Em desenvolvimento local: a API estará em http://localhost:3000
 * Em produção: a API estará no Vercel (ex: https://seu-projeto.vercel.app)
 * 
 * CONFIGURAÇÃO EM PRODUÇÃO:
 * Para configurar a URL em produção, defina a variável antes de carregar este script:
 * <script>
 *   window.API_URL = "https://seu-projeto.vercel.app";
 * </script>
 * <script src="config.js"></script>
 * 
 * OU use variáveis de ambiente/build time para substituir {{API_URL}} no HTML
 */

// Detecta se está em desenvolvimento ou produção
const isDevelopment = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// URL base da API
const API_BASE_URL = isDevelopment 
  ? "http://localhost:3000" 
  : (window.API_URL || window.location.origin); // Usa API_URL se definida, senão usa origin

// Aviso em desenvolvimento
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
