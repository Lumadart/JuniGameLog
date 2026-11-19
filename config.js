/* =====================================================================
   CONFIGURAÇÃO DO SITE  —  é o único arquivo que você precisa editar
   ===================================================================== */
window.SITE_CONFIG = {

  // 1) Cole aqui a URL do app da web do Apps Script (a que termina em /exec).
  //    Enquanto estiver como está abaixo, o site mostra jogos de DEMONSTRAÇÃO.
  API_URL: 'https://script.google.com/macros/s/AKfycby7gMwnP-vYF5eES1OaEmj__Q6tl27GxuGoR6pcchXbNrn4emdMNu8EtsQBavRWaAnU/exec',

  // 2) Identidade do site
  SITE_NAME: 'JUNIGAMI',
  TAGLINE: 'Diário de um jogador',

  // 3) Sobre o autor (aparece no fim de cada resenha e na página "Sobre")
  AUTHOR: {
    nome: 'Juni',
    foto: '',   // link de uma imagem (opcional)
    bio: 'Gamer desde sempre, apaixonado por boas histórias, trilhas marcantes e jogos que ficam na cabeça muito depois dos créditos.'
  },

  // Texto da página "Sobre" (cada item vira um parágrafo)
  ABOUT: [
    'Este é o meu diário de jogos: um lugar para registrar o que joguei, o que quero jogar e, principalmente, o que eu realmente achei de cada um.',
    'Aqui você encontra resenhas sinceras, notas por categoria e listas pessoais. Sem patrocínio e sem pressa: a opinião é só minha.'
  ],

  // 4) Redes sociais (deixe vazio '' para esconder)
  SOCIAL: {
    instagram: '',
    youtube: '',
    twitch: '',
    x: '',
    email: ''     // ex.: 'contato@exemplo.com'
  },

  // 5) Quantas resenhas por página nas listagens
  PER_PAGE: 10
};
