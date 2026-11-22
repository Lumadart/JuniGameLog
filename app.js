/* JUNIGAMI — site estático que lê os jogos e as configurações do Apps Script (planilha Google). */
(function () {
  'use strict';

  /* ================= configuração ================= */
  const BASE = window.SITE_CONFIG || {};
  const DEF = {
    API_URL: BASE.API_URL || '',
    SITE_NAME: BASE.SITE_NAME || 'JUNIGAMI',
    TAGLINE: typeof BASE.TAGLINE === 'string' ? BASE.TAGLINE : 'Diário de um jogador',
    ICONE: BASE.ICONE || '🎮',
    DESCRICAO: BASE.DESCRICAO || 'Resenhas sinceras de um jogador apaixonado: notas, opiniões e listas dos jogos que passaram pelo controle.',
    RODAPE: typeof BASE.RODAPE === 'string' ? BASE.RODAPE : 'Resenhas sinceras de um jogador apaixonado por histórias, desafios e conquistas.',
    COPY: typeof BASE.COPY === 'string' ? BASE.COPY : 'Todas as opiniões são minhas.',
    AUTHOR: Object.assign({ nome: 'Juni', foto: '', bio: 'Gamer desde sempre, apaixonado por boas histórias, trilhas marcantes e jogos que ficam na cabeça muito depois dos créditos.' }, BASE.AUTHOR || {}),
    ABOUT: BASE.ABOUT || ['Este é o meu diário de jogos: um lugar para registrar o que joguei, o que quero jogar e, principalmente, o que eu realmente achei de cada um.', 'Aqui você encontra resenhas sinceras, notas por categoria e listas pessoais. Sem patrocínio e sem pressa: a opinião é só minha.'],
    SOCIAL: BASE.SOCIAL || {},
    PER_PAGE: BASE.PER_PAGE || 10,
    HOME: Object.assign({ finalizados: true, ultimas: true, top10: true, generos: true }, BASE.HOME || {})
  };
  const CFG = JSON.parse(JSON.stringify(DEF));

  /* aplica as configurações vindas da planilha (aba "Site" do formulário) */
  function applySite(s) {
    if (!s || typeof s !== 'object') return;
    const txt = (v, d) => typeof v === 'string' ? v.trim() : d;
    CFG.SITE_NAME = txt(s.nome, '') || DEF.SITE_NAME;
    CFG.TAGLINE = txt(s.tagline, DEF.TAGLINE);
    CFG.ICONE = txt(s.icone, '') || DEF.ICONE;
    CFG.DESCRICAO = txt(s.descricao, DEF.DESCRICAO);
    CFG.RODAPE = txt(s.rodape, DEF.RODAPE);
    CFG.COPY = txt(s.copyright, DEF.COPY);
    const a = s.autor && typeof s.autor === 'object' ? s.autor : {};
    CFG.AUTHOR = { nome: txt(a.nome, '') || DEF.AUTHOR.nome, foto: txt(a.foto, ''), bio: txt(a.bio, DEF.AUTHOR.bio) };
    CFG.ABOUT = typeof s.sobre === 'string' ? s.sobre.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean) : DEF.ABOUT;
    CFG.SOCIAL = s.social && typeof s.social === 'object' ? s.social : DEF.SOCIAL;
    const pp = Number(s.porPagina);
    CFG.PER_PAGE = pp >= 3 && pp <= 50 ? Math.round(pp) : DEF.PER_PAGE;
    CFG.HOME = Object.assign({}, DEF.HOME, s.home && typeof s.home === 'object' ? s.home : {});
    setFavicon(CFG.ICONE);
  }

  const app = document.getElementById('app');
  const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  let DATA = { jogos: [], tema: null };
  let DEMO = false, lastSig = '', loaded = false;

  /* ================= utilidades ================= */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const enc = encodeURIComponent;
  const safeUrl = u => { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : ''; };
  const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const initials = t => String(t).trim().split(/\s+/).slice(0, 3).map(w => w[0] || '').join('').toUpperCase();
  const nota = n => n == null ? '—' : (Math.round(n * 10) / 10 >= 10 ? '10' : n.toFixed(1));
  const cnt = n => n == null ? '' : `<span data-count="${n}">${nota(n)}</span>`;
  const fnum = n => String(Math.round(n * 10) / 10).replace('.', ',');
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  function fdata(iso) {
    if (!iso) return '';
    const d = new Date(iso); if (isNaN(d)) return '';
    return d.getDate() + ' de ' + MESES[d.getMonth()] + ', ' + d.getFullYear();
  }
  function flanc(s) {
    const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/.exec(String(s || '')); if (!m) return '';
    if (!m[2]) return m[1];
    return (m[3] ? (+m[3]) + ' de ' : '') + MESES[+m[2] - 1] + (m[3] ? ', ' : ' de ') + m[1];
  }
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2800); }
  function setMeta(title, desc) {
    document.title = (title ? title + ' · ' + CFG.SITE_NAME : CFG.SITE_NAME + (CFG.TAGLINE ? ' · ' + CFG.TAGLINE : ''));
    const m = document.querySelector('meta[name=description]'); if (m) m.setAttribute('content', String(desc || CFG.DESCRICAO).slice(0, 160));
  }
  let favEmoji = '🎮';
  function setFavicon(emoji) {
    if (emoji) favEmoji = emoji;
    const f = document.getElementById('fav'); if (!f) return;
    if (favEmoji === '🎮') { /* ícone neutro da marca: funciona com qualquer cor de destaque */
      f.type = 'image/svg+xml'; f.href = 'favicon.svg';
    } else {
      f.type = 'image/svg+xml';
      f.href = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${favEmoji}</text></svg>`);
    }
  }

  /* ================= ícones ================= */
  const P = {
    gamepad: '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258A4 4 0 0 0 17.32 5z"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    arr: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    chl: '<path d="m15 18-6-6 6-6"/>', chr: '<path d="m9 18 6-6-6-6"/>', chu: '<path d="m18 15-6-6-6 6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    cal: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/>',
    check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    tick: '<path d="M20 6 9 17l-5-5"/>',
    xc: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    crown: '<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>',
    skull: '<path d="m12.5 17-.5-1-.5 1h1z"/><path d="M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="12" r="1"/>',
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    pen: '<path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    swords: '<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" x2="9" y1="14" y2="18"/><line x1="7" x2="4" y1="17" y2="20"/><line x1="3" x2="5" y1="19" y2="21"/>',
    compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    aim: '<circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/>',
    grid: '<rect width="7" height="7" x="3" y="3"/><rect width="7" height="7" x="14" y="3"/><rect width="7" height="7" x="14" y="14"/><rect width="7" height="7" x="3" y="14"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    insta: '<rect width="20" height="20" x="2" y="2" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>',
    yt: '<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
    twitch: '<path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7"/>',
    x: '<path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>',
    tiktok: '<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>',
    discord: '<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M21 16v2a4 4 0 0 1-4 4h-5"/>',
    steam: '<circle cx="12" cy="12" r="10"/><circle cx="15.5" cy="9.5" r="2.5"/><path d="m3.5 13 5 2m0 0a2 2 0 1 0 1.5 3.4A2 2 0 0 0 8.5 15z"/>',
    wa: '<path d="M3 21l1.65-4.9A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 10c.5 2 2 3.5 4 4l1.2-1.2a.6.6 0 0 1 .7-.1l1.6.8c.3.2.4.5.3.8-.3 1-1.3 1.7-2.4 1.6-3.2-.4-6-3.2-6.4-6.4-.1-1.1.6-2.1 1.6-2.4.3-.1.6 0 .8.3l.8 1.6c.1.2.1.5-.1.7z"/>'
  };
  const ic = n => `<svg class="i" viewBox="0 0 24 24">${P[n] || ''}</svg>`;
  const GENRE_ICON = { 'Ação': 'swords', 'Luta': 'swords', 'Aventura': 'compass', 'Mundo aberto': 'compass', 'Metroidvania': 'compass', 'RPG': 'shield', 'JRPG': 'shield', 'Soulslike': 'shield',
    'Terror': 'skull', 'Sobrevivência': 'skull', 'Tiro': 'aim', 'Estratégia': 'grid', 'Puzzle': 'grid', 'Simulação': 'grid', 'Esportes': 'trophy', 'Corrida': 'gauge' };
  const gIcon = g => ic(GENRE_ICON[g] || 'gamepad');

  /* ================= dados ================= */
  const STATUS_COLORS = { 'Quero jogar': '#38bdf8', 'Jogando': '#818cf8', 'Finalizado': '#34d399', '100% / Platinado': '#fbbf24', 'Pausado': '#94a3b8', 'Abandonado': '#f87171' };
  const STATUS_PLAYED = ['Jogando', 'Finalizado', '100% / Platinado', 'Pausado', 'Abandonado'];
  const CLASS_COLORS = { 'L': '#22c55e', '10': '#38bdf8', '12': '#facc15', '14': '#fb923c', '16': '#ef4444', '18': '#e5e7eb' };
  const CRIT = [['gameplay', 'Jogabilidade'], ['historia', 'História'], ['direcaoArtistica', 'Direção artística'], ['som', 'Trilha sonora'], ['designEExp', 'Design & experiência']];

  function normalize(j) {
    const n = j.notas || {};
    const arr = a => Array.isArray(a) ? a.filter(Boolean) : [];
    const num = v => (v === '' || v == null || isNaN(Number(v))) ? null : Number(v);
    return {
      id: j.id, titulo: String(j.titulo || ''), subtitulo: j.subtitulo || '', desenvolvedora: j.desenvolvedora || '', lancamento: j.lancamento || '',
      plataformas: arr(j.plataformas), generos: arr(j.generos), classificacao: String(j.classificacao || ''), capa: j.capa || '', sinopse: j.sinopse || '',
      screenshots: arr(j.screenshots).map(safeUrl).filter(Boolean), status: j.status || '', top10: num(j.top10), destaque: !!j.destaque,
      notas: { gameplay: num(n.gameplay), historia: num(n.historia), direcaoArtistica: num(n.direcaoArtistica), som: num(n.som), designEExp: num(n.designEExp), final: num(n.final) },
      tempoJogo: num(j.tempoJogo), dificuldade: j.dificuldade || '', replay: j.replay || '', recomendo: j.recomendo || '',
      positivos: arr(j.positivos), negativos: arr(j.negativos), fraseDestaque: j.fraseDestaque || '', veredito: j.veredito || '', resenha: j.resenha || '', data: j.data || ''
    };
  }
  const J = () => DATA.jogos;
  const isQuero = j => j.status === 'Quero jogar';
  const hasScore = j => j.notas.final != null;
  const hasReview = j => hasScore(j) || !!j.resenha;
  const finished = j => j.status === 'Finalizado' || j.status === '100% / Platinado';
  const byDate = (a, b) => String(b.data || '').localeCompare(String(a.data || '')) || (Number(b.id) - Number(a.id));
  const lnk = j => '#/jogo/' + enc(j.id);
  const exc = (j, n) => {
    const t = (j.fraseDestaque || j.veredito || j.resenha || j.sinopse || '').replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
  };
  function genreStats() {
    const m = new Map();
    J().filter(j => !isQuero(j)).forEach(j => j.generos.forEach(g => m.set(g, (m.get(g) || 0) + 1)));
    return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'));
  }
  const SORT = {
    recentes: byDate,
    nota: (a, b) => (b.notas.final == null ? -1 : b.notas.final) - (a.notas.final == null ? -1 : a.notas.final) || byDate(a, b),
    titulo: (a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'),
    horas: (a, b) => (b.tempoJogo == null ? -1 : b.tempoJogo) - (a.tempoJogo == null ? -1 : a.tempoJogo),
    lancamento: (a, b) => String(b.lancamento).localeCompare(String(a.lancamento))
  };
  const SORT_LABELS = [['recentes', 'Mais recentes'], ['nota', 'Maior nota'], ['titulo', 'Título (A–Z)'], ['horas', 'Mais horas jogadas'], ['lancamento', 'Lançamento']];

  /* ================= componentes ================= */
  function pic(src, title, cls) {
    const u = safeUrl(src);
    return `<div class="pic ${cls || ''}" style="--h:${hue(title)}"><span class="ph">${esc(initials(title))}</span>${u ? `<img src="${esc(u)}" alt="${esc(title)}" loading="lazy" referrerpolicy="no-referrer">` : ''}</div>`;
  }
  const chip = s => s ? `<span class="schip" style="--c:${STATUS_COLORS[s] || '#888'}">${esc(s)}</span>` : '';
  function sec(title, icon, href, body, label) {
    return `<section class="sec"><div class="sec-h"><span class="ico">${ic(icon)}</span><h2>${esc(title)}</h2>${href ? `<a class="btn line" href="${href}">${esc(label || 'Ver todos')}</a>` : ''}</div>${body}</section>`;
  }
  function gcard(j, o) {
    o = o || {};
    return `<a class="gcard" href="${lnk(j)}">${pic(j.capa, j.titulo, 'p34')}${o.rank ? `<span class="rank r${o.rank}">${o.rank}</span>` : ''}<div class="gc-foot"><b>${esc(j.titulo)}</b>${j.tempoJogo != null ? `<span class="hbadge">${fnum(j.tempoJogo)}h</span>` : ''}</div></a>`;
  }
  function rail(list, rank) {
    return `<div class="rail-wrap"><button class="rail-btn l" data-rail="-1" aria-label="Anterior">${ic('chl')}</button><div class="rail">${list.map((j, i) => gcard(j, rank ? { rank: i + 1 } : {})).join('')}</div><button class="rail-btn r" data-rail="1" aria-label="Próximo">${ic('chr')}</button></div>`;
  }
  function rcard(j) {
    return `<a class="rcard" href="${lnk(j)}"><div class="rc-img">${pic(j.capa || j.screenshots[0], j.titulo)}${hasScore(j) ? `<span class="sbadge">${nota(j.notas.final)}</span>` : ''}<h3>${esc(j.titulo)}</h3></div>
      <div class="rc-body"><div class="rc-meta"><span>${esc(j.generos.slice(0, 2).join(' / '))}</span><span>${ic('cal')}${esc(fdata(j.data))}</span></div><p>${esc(exc(j, 95))}</p><span class="rc-link">Ler resenha ${ic('arr')}</span></div></a>`;
  }
  function row(j, o) {
    o = o || {};
    const sc = j.notas.final;
    return `<a class="row" href="${lnk(j)}">${o.rank ? `<span class="rowrank">${o.rank}</span>` : ''}${pic(j.capa || j.screenshots[0], j.titulo, 'rimg')}
      <div class="rbody"><h3>${esc(j.titulo)}</h3><p>${esc(exc(j, 150))}</p>
      <div class="rmeta">${j.plataformas.length ? `<span>${ic('monitor')}${esc(j.plataformas.slice(0, 3).join(', '))}</span>` : ''}${j.tempoJogo != null ? `<span>${ic('clock')}${fnum(j.tempoJogo)}h</span>` : ''}${j.data ? `<span>${ic('cal')}${esc(fdata(j.data))}</span>` : ''}${chip(j.status)}</div></div>
      <div class="rscore">${sc != null ? `${cnt(sc)}<small>/10</small>` : ''}</div></a>`;
  }
  function gtile(g, n) {
    return `<a class="gtile" href="#/genero/${enc(g)}">${gIcon(g)}<b>${esc(g)}</b><small>${n} ${n === 1 ? 'resenha' : 'resenhas'}</small></a>`;
  }
  function scoreBox(j, vazio) {
    const n = j.notas;
    /* sem nota: mantém o espaço com tudo zerado, para o layout ser sempre o mesmo */
    const rows = CRIT.filter(([k]) => vazio || n[k] != null).map(([k, l], i) => `<li style="--i:${i}"><span>${l}</span><b>${vazio ? '0.0' : nota(n[k])}</b><i class="bar" style="--w:${vazio ? 0 : n[k] * 10}%"></i></li>`).join('');
    return `<aside class="scorebox${vazio ? ' nil' : ''}"><div class="sb-lab">Minha nota</div><div class="sb-big">${vazio ? '0.0' : cnt(n.final)}<small>/10</small></div>${rows ? `<ul>${rows}</ul>` : ''}${vazio ? '<q>Ainda sem nota.</q>' : j.fraseDestaque ? `<q>“${esc(j.fraseDestaque)}”</q>` : ''}</aside>`;
  }
  /* ícones de marca (Font Awesome) para as plataformas que têm um; as outras viram texto */
  const PLAT_FA = [[/^(pc|windows)\b/i, 'windows'], [/steam/i, 'steam'], [/playstation|^ps\s?\d|^psp|vita/i, 'playstation'], [/xbox/i, 'xbox'], [/switch/i, 'nintendo-switch'],
    [/android/i, 'android'], [/^(ios|iphone|ipad|mac)/i, 'apple'], [/linux/i, 'linux']];
  function platsHtml(list) {
    const ico = new Map(), txt = [];
    list.forEach(p => { const m = PLAT_FA.find(([re]) => re.test(p)); if (m) { if (!ico.has(m[1])) ico.set(m[1], []); ico.get(m[1]).push(p); } else txt.push(p); });
    const mais = txt.length > 6 ? txt.length - 6 : 0;
    return [...ico].map(([fa, ps]) => `<i class="fa-brands fa-${fa} pf" title="${esc(ps.join(', '))}" aria-label="${esc(ps.join(', '))}"></i>`).join('')
      + (txt.length ? `<span class="ptxt">${esc(txt.slice(0, 6).join(' · '))}${mais ? ` <em title="${esc(txt.slice(6).join(', '))}">+${mais}</em>` : ''}</span>` : '');
  }
  const empty = (t, d) => `<div class="state"><h2>${esc(t)}</h2><p>${esc(d || '')}</p></div>`;
  const emptyBtn = (t, d, href, label) => `<div class="state"><h2>${esc(t)}</h2><p>${esc(d || '')}</p><a class="btn primary" href="${href}">${esc(label)}</a></div>`;
  function pagerHtml(cur, pages) {
    if (pages <= 1) return '';
    const nums = [];
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - cur) <= 1) nums.push(i);
      else if (nums[nums.length - 1] !== '…') nums.push('…');
    }
    return `<button data-page="${cur - 1}" ${cur === 1 ? 'disabled' : ''} aria-label="Página anterior">${ic('chl')}</button>` +
      nums.map(n => n === '…' ? '<span>…</span>' : `<button data-page="${n}" class="${n === cur ? 'on' : ''}">${n}</button>`).join('') +
      `<button data-page="${cur + 1}" ${cur === pages ? 'disabled' : ''} aria-label="Próxima página">${ic('chr')}</button>`;
  }
  const paras = t => String(t).split(/\n{2,}/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

  /* ================= tema ================= */
  function lum(hex) {
    const c = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4));
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  }
  function applyTheme(t) {
    const ok = /^#[0-9a-f]{6}$/i;
    if (!t || !ok.test(t.acc) || !ok.test(t.acc2)) return;
    const s = document.documentElement.style;
    s.setProperty('--acc', t.acc); s.setProperty('--acc2', t.acc2);
    s.setProperty('--on-acc', lum(t.acc) > .38 ? '#0a0a0e' : '#ffffff');
    s.setProperty('--on-acc2', lum(t.acc2) > .38 ? '#0a0a0e' : '#ffffff');
    try { localStorage.setItem('junigami:tema', JSON.stringify({ acc: t.acc, acc2: t.acc2 })); } catch (e) {}
    setFavicon();
  }

  /* ================= cabeçalho / rodapé ================= */
  const NAV = [['inicio', '#/', 'Início'], ['resenhas', '#/resenhas', 'Resenhas'], ['generos', '#/generos', 'Gêneros'], ['listas', '#/listas', 'Listas'], ['sobre', '#/sobre', 'Sobre']];
  function socialLinks() {
    const s = CFG.SOCIAL || {}, out = [];
    [['instagram', 'insta', 'Instagram'], ['youtube', 'yt', 'YouTube'], ['twitch', 'twitch', 'Twitch'], ['x', 'x', 'X'], ['tiktok', 'tiktok', 'TikTok'], ['discord', 'discord', 'Discord'], ['steam', 'steam', 'Steam']]
      .forEach(([k, icon, label]) => { if (s[k]) out.push({ icon, label, href: s[k] }); });
    if (s.email) out.push({ icon: 'mail', label: 'E-mail', href: 'mailto:' + s.email });
    return out.filter(o => /^(https?:|mailto:)/i.test(o.href));
  }
  const brandHtml = () => `<span class="logo">${ic('gamepad')}</span><span><b>${esc(CFG.SITE_NAME)}</b>${CFG.TAGLINE ? `<small>${esc(CFG.TAGLINE)}</small>` : ''}</span>`;
  function renderChrome() {
    const soc = socialLinks();
    $('#header').innerHTML = `<div class="top-in">
      <a class="brand" href="#/" aria-label="${esc(CFG.SITE_NAME)}">${brandHtml()}</a>
      <button class="burger" id="burger" aria-label="Menu">${ic('menu')}</button>
      <nav class="nav" id="nav">${NAV.map(([k, h, l]) => `<a href="${h}" data-nav="${k}">${l}</a>`).join('')}</nav>
      <div class="top-r">
        ${soc.length ? `<div class="social">${soc.map(o => `<a href="${esc(o.href)}" target="_blank" rel="noopener" aria-label="${o.label}" title="${o.label}">${ic(o.icon)}</a>`).join('')}</div>` : ''}
        <form class="search" id="sform" role="search">${ic('search')}<input id="sq" type="search" placeholder="Buscar jogos..." aria-label="Buscar jogos"></form>
      </div></div>`;
    $('#sform').addEventListener('submit', e => { e.preventDefault(); const v = $('#sq').value.trim(); document.body.classList.remove('menu'); location.hash = '#/resenhas' + (v ? '?q=' + enc(v) : ''); });
    $('#burger').addEventListener('click', () => document.body.classList.toggle('menu'));
    renderFooter();
    const cur = (location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]) || 'inicio';
    setNav({ jogo: 'resenhas', genero: 'generos' }[cur] || cur);
  }
  function renderFooter() {
    const soc = socialLinks(), top = genreStats().slice(0, 6);
    $('#footer').innerHTML = `<div class="foot-in">
      <div><a class="brand" href="#/">${brandHtml()}</a>${CFG.RODAPE ? `<p>${esc(CFG.RODAPE)}</p>` : ''}</div>
      <div><h4>Navegação</h4><ul>${NAV.map(([, h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')}</ul></div>
      <div><h4>Categorias populares</h4><ul>${top.length ? top.map(([g]) => `<li><a href="#/genero/${enc(g)}">${esc(g)}</a></li>`).join('') : '<li>—</li>'}</ul></div>
      <div><h4>Conecte-se</h4>${soc.length ? `<div class="social">${soc.map(o => `<a href="${esc(o.href)}" target="_blank" rel="noopener" aria-label="${o.label}" title="${o.label}">${ic(o.icon)}</a>`).join('')}</div>` : '<p style="margin:0">Em breve.</p>'}</div>
    </div><div class="foot-bot"><span>© ${new Date().getFullYear()} ${esc(CFG.SITE_NAME)}${CFG.TAGLINE ? ' · ' + esc(CFG.TAGLINE) : ''}.</span><span>${esc(CFG.COPY)}</span></div>`;
  }
  function setNav(key) { $$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === key)); }

  /* ================= páginas ================= */
  function home() {
    setMeta('', CFG.DESCRICAO);
    const all = J();
    if (!all.length) { app.innerHTML = empty('Ainda não há jogos', 'Cadastre o primeiro jogo no formulário e ele aparece aqui.'); return; }
    const H = CFG.HOME || {};
    const played = all.filter(j => !isQuero(j));
    const reviews = all.filter(hasReview).sort(byDate);
    const feat = all.find(j => j.destaque && !isQuero(j)) || reviews[0] || played[0] || all[0];
    const fin = all.filter(finished).sort(byDate).slice(0, 16);
    const top10 = all.filter(j => j.top10).sort((a, b) => a.top10 - b.top10).slice(0, 10);
    const gens = genreStats().slice(0, 7);
    const featCapa = safeUrl(feat.capa), bg = featCapa || feat.screenshots[0];

    let html = `<div class="wrap">
      <section class="hero">${bg ? `<img class="hero-bg${featCapa ? ' soft' : ''}" src="${esc(bg)}" alt="" referrerpolicy="no-referrer">` : ''}<div class="hero-fade"></div>
        <div class="hero-l"><span class="tag-feat">${feat.destaque ? 'Resenha em destaque' : hasReview(feat) ? 'Última resenha' : 'Em destaque'}</span>
          <h1>${esc(feat.titulo)}</h1>${feat.subtitulo ? `<div class="sub">${esc(feat.subtitulo)}</div>` : ''}
          <p>${esc(exc({ sinopse: feat.sinopse }, 190))}</p>
          <a class="btn primary" href="${lnk(feat)}">${hasReview(feat) ? 'Ler resenha completa' : 'Ver detalhes'} ${ic('arr')}</a></div>
        ${hasScore(feat) ? scoreBox(feat) : ''}
      </section>`;
    if (H.finalizados !== false && fin.length) html += sec('Jogos que passaram pelo controle', 'gamepad', '#/listas/finalizados', rail(fin));
    if (H.ultimas !== false && reviews.length) html += sec('Últimas resenhas', 'pen', '#/resenhas', `<div class="rgrid">${reviews.slice(0, 4).map(rcard).join('')}</div>`, 'Ver todas as resenhas');
    if (H.top10 !== false && top10.length) html += sec('Meu Top 10', 'trophy', '#/listas/top10', rail(top10, true));
    if (H.generos !== false && gens.length) html += sec('Navegue por gênero', 'gamepad', '#/generos', `<div class="gtiles">${gens.map(([g, n]) => gtile(g, n)).join('')}</div>`);
    app.innerHTML = html + '</div>';
  }

  function listPage(q, fixedGen) {
    const base = J().filter(j => !isQuero(j));
    const uniq = a => [...new Set(a)].sort((x, y) => x.localeCompare(y, 'pt-BR'));
    const plats = uniq(base.flatMap(j => j.plataformas)), gens = uniq(base.flatMap(j => j.generos));
    const f = { q: q.get('q') || '', status: q.get('status') || '', plat: q.get('plat') || '', gen: fixedGen || q.get('gen') || '', sort: q.get('sort') || 'recentes', page: Math.max(1, parseInt(q.get('page'), 10) || 1) };
    const title = fixedGen ? 'Gênero: ' + fixedGen : 'Resenhas';
    const basePath = fixedGen ? '#/genero/' + enc(fixedGen) : '#/resenhas';
    setMeta(title, fixedGen ? 'Resenhas de jogos do gênero ' + fixedGen + '.' : 'Todas as resenhas de jogos.');
    const opt = (arr, cur, all) => `<option value="">${all}</option>` + arr.map(v => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(v)}</option>`).join('');
    app.innerHTML = `<div class="wrap page">
      <nav class="crumbs"><a href="#/">Início</a>${ic('chr')}${fixedGen ? '<a href="#/generos">Gêneros</a>' + ic('chr') : ''}<span>${esc(title)}</span></nav>
      <div class="ph-h"><h1>${esc(title)}</h1><div class="count" id="cnt"></div></div>
      <div class="filters">
        <label class="fsearch">${ic('search')}<input id="fq" type="search" placeholder="Buscar por título..." value="${esc(f.q)}" aria-label="Buscar"></label>
        <select id="fs" aria-label="Status">${opt(STATUS_PLAYED, f.status, 'Todos os status')}</select>
        <select id="fp" aria-label="Plataforma">${opt(plats, f.plat, 'Todas as plataformas')}</select>
        ${fixedGen ? '' : `<select id="fg" aria-label="Gênero">${opt(gens, f.gen, 'Todos os gêneros')}</select>`}
        <select id="fo" aria-label="Ordenar">${SORT_LABELS.map(([v, l]) => `<option value="${v}"${v === f.sort ? ' selected' : ''}>${l}</option>`).join('')}</select>
      </div>
      <div id="results"></div><div class="pager" id="pager"></div></div>`;

    function update(scroll) {
      const nq = norm(f.q);
      const list = base.filter(j => (!f.status || j.status === f.status) && (!f.plat || j.plataformas.includes(f.plat)) && (!f.gen || j.generos.includes(f.gen)) &&
        (!nq || norm(j.titulo + ' ' + j.desenvolvedora).includes(nq))).sort(SORT[f.sort] || SORT.recentes);
      const per = CFG.PER_PAGE || 10, pages = Math.max(1, Math.ceil(list.length / per));
      if (f.page > pages) f.page = pages;
      $('#cnt').textContent = list.length + (list.length === 1 ? ' resenha' : ' resenhas');
      $('#results').innerHTML = list.length ? list.slice((f.page - 1) * per, f.page * per).map(j => row(j)).join('') : empty('Nada encontrado', 'Tente mudar os filtros ou a busca.');
      $('#pager').innerHTML = pagerHtml(f.page, pages);
      const p = new URLSearchParams();
      if (f.q) p.set('q', f.q); if (f.status) p.set('status', f.status); if (f.plat) p.set('plat', f.plat);
      if (!fixedGen && f.gen) p.set('gen', f.gen); if (f.sort !== 'recentes') p.set('sort', f.sort); if (f.page > 1) p.set('page', f.page);
      const qs = p.toString();
      history.replaceState(null, '', basePath + (qs ? '?' + qs : ''));
      fx($('#results')); markImgs($('#results'));
      if (scroll) $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    let t;
    $('#fq').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { f.q = e.target.value; f.page = 1; update(); }, 180); });
    [['fs', 'status'], ['fp', 'plat'], ['fg', 'gen'], ['fo', 'sort']].forEach(([id, k]) => { const el = $('#' + id); if (el) el.addEventListener('change', e => { f[k] = e.target.value; f.page = 1; update(); }); });
    $('#pager').addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b && !b.disabled) { f.page = +b.dataset.page; update(true); } });
    update();
  }

  function generos() {
    setMeta('Gêneros', 'Navegue pelas resenhas por gênero.');
    const gs = genreStats();
    app.innerHTML = `<div class="wrap page"><nav class="crumbs"><a href="#/">Início</a>${ic('chr')}<span>Gêneros</span></nav>
      <div class="ph-h"><h1>Gêneros</h1><div class="count">${gs.length} ${gs.length === 1 ? 'gênero' : 'gêneros'}</div></div>
      ${gs.length ? `<div class="gtiles big">${gs.map(([g, n]) => gtile(g, n)).join('')}</div>` : empty('Nenhum gênero ainda', 'Os gêneros aparecem conforme você cadastra jogos.')}</div>`;
  }

  const LISTAS = [
    ['top10', 'Top 10', 'trophy', j => j.top10, (a, b) => a.top10 - b.top10],
    ['jogando', 'Jogando agora', 'gamepad', j => j.status === 'Jogando', byDate],
    ['quero', 'Quero jogar', 'bookmark', isQuero, byDate],
    ['finalizados', 'Finalizados', 'check', j => j.status === 'Finalizado', byDate],
    ['platinados', '100% / Platinados', 'crown', j => j.status === '100% / Platinado', byDate],
    ['pausados', 'Pausados', 'pause', j => j.status === 'Pausado', byDate],
    ['abandonados', 'Abandonados', 'skull', j => j.status === 'Abandonado', byDate]
  ];
  function listas(key) {
    setMeta('Listas', 'Meu Top 10, jogos que quero jogar, finalizados e mais.');
    const sets = LISTAS.map(([k, l, i, fl, so]) => ({ k, l, i, items: J().filter(fl).sort(so) }));
    const cur = sets.find(s => s.k === key) || sets.find(s => s.items.length) || sets[0];
    app.innerHTML = `<div class="wrap page"><nav class="crumbs"><a href="#/">Início</a>${ic('chr')}<span>Listas</span></nav>
      <div class="ph-h"><h1>Listas</h1></div>
      <div class="tabs">${sets.map(s => `<a href="#/listas/${s.k}" class="${s.k === cur.k ? 'on' : ''}">${ic(s.i)}${s.l}<em>${s.items.length}</em></a>`).join('')}</div>
      ${!cur.items.length ? empty('Lista vazia', 'Ainda não há jogos nesta lista.') :
        cur.k === 'top10' ? cur.items.map(j => row(j, { rank: j.top10 })).join('') : `<div class="ggrid">${cur.items.map(j => gcard(j)).join('')}</div>`}</div>`;
  }

  function jogo(id) {
    const j = J().find(x => String(x.id) === String(id));
    if (!j) { setMeta('Não encontrado'); app.innerHTML = emptyBtn('Jogo não encontrado', 'Esse jogo não existe (ou foi removido).', '#/resenhas', 'Ver resenhas'); return; }
    setMeta(j.titulo, exc(j, 150));
    const capaUrl = safeUrl(j.capa);
    const bg = capaUrl || j.screenshots[0];
    const sc = hasScore(j), quero = isQuero(j);
    const meta = [];
    if (j.generos.length) meta.push(`<li>${ic('gamepad')}<span class="gen">${j.generos.map(g => `<a href="#/genero/${enc(g)}">${esc(g)}</a>`).join('<i class="sl">/</i>')}</span></li>`);
    if (j.lancamento) meta.push(`<li>${ic('cal')}<span class="lab">Lançamento:</span> <b>${esc(String(j.lancamento).slice(0, 4))}</b></li>`);
    if (j.desenvolvedora) meta.push(`<li>${ic('code')}<span class="lab">Desenvolvedora:</span> <b>${esc(j.desenvolvedora)}</b></li>`);
    if (j.plataformas.length) meta.push(`<li class="plats">${ic('monitor')}<span class="lab">Plataformas:</span> ${platsHtml(j.plataformas)}</li>`);

    const RC = { 'Sim': 'rc-Sim', 'Talvez': 'rc-Talvez', 'Não': 'rc-Nao', 'Nunca': 'rc-Nunca', 'Nem morto': 'rc-Nem-morto' };
    const stxt = s => s ? `<span style="color:${STATUS_COLORS[s] || 'inherit'}">${esc(s)}</span>` : '';
    const clsf = j.classificacao ? `<span class="cbadge" title="Classificação indicativa" style="--c:${CLASS_COLORS[j.classificacao] || '#999'}">${esc(j.classificacao)}</span>` : '';
    const stats = [['Status', stxt(j.status)], ['Classificação', clsf], ['Tempo de jogo', j.tempoJogo != null ? fnum(j.tempoJogo) + ' horas' : ''], ['Dificuldade', esc(j.dificuldade)], ['Replay', esc(j.replay)],
      ['Recomendo', j.recomendo ? `<span class="${RC[j.recomendo] || ''}">${esc(j.recomendo)}</span>` : '']];
    const shots = j.screenshots;
    const related = J().filter(x => x.id !== j.id && !isQuero(x) && x.generos.some(g => j.generos.includes(g))).sort(SORT.nota).slice(0, 5);
    const au = CFG.AUTHOR || {};
    const avatar = safeUrl(au.foto) ? `<img src="${esc(safeUrl(au.foto))}" alt="" referrerpolicy="no-referrer">` : esc((au.nome || CFG.SITE_NAME)[0].toUpperCase());
    const pageUrl = location.href.split('#')[0] + '#/jogo/' + enc(j.id);
    const shareText = j.titulo + (sc ? ' — nota ' + nota(j.notas.final) + '/10' : '') + ' · ' + CFG.SITE_NAME;

    app.innerHTML = `<section class="jhero">${bg ? `<img class="hero-bg${capaUrl ? ' soft' : ''}" src="${esc(bg)}" alt="" referrerpolicy="no-referrer">` : ''}<div class="hero-fade"></div>
      <div class="wrap jwrap">
        <div class="jinfo"><nav class="crumbs"><a href="#/">Início</a>${ic('chr')}<a href="#/resenhas">Resenhas</a>${ic('chr')}<span>${esc(j.titulo)}</span></nav>
          <h1>${esc(j.titulo)}</h1>${j.subtitulo ? `<div class="sub">${esc(j.subtitulo)}</div>` : ''}<ul class="jmeta">${meta.join('')}</ul>
          <div class="jstats">${stats.map(([l, v]) => `<div class="stat"><small>${l}</small><b>${v || '<span class="nil">—</span>'}</b></div>`).join('')}</div></div>
        ${scoreBox(j, !sc)}
      </div></section>
      <div class="wrap jbody">
        <aside class="jside"><div class="jposter${capaUrl ? ' zoom' : ''}"${capaUrl ? ' data-zoom="1" role="button" tabindex="0" aria-label="Ampliar a capa"' : ''}>${pic(j.capa, j.titulo, 'p34')}${j.top10 ? `<span class="rank r${j.top10}">Top ${j.top10}</span>` : ''}</div></aside>
        <div class="jmain">
          ${quero ? `<div class="wish">${ic('bookmark')}<span>Este jogo está na minha lista de desejos. Ainda não joguei, então não há nota nem resenha.</span></div>` : ''}
          ${j.sinopse ? `<section class="block"><h2>Sobre o jogo</h2><div class="prose">${paras(j.sinopse)}</div></section>` : ''}
          ${j.resenha ? `<section class="block"><h2>Minha experiência</h2><div class="prose">${paras(j.resenha)}</div></section>` : ''}
          ${shots.length ? `<section class="block"><h2>Galeria</h2><div class="gal-main"><img id="galMain" src="${esc(shots[0])}" alt="Screenshot de ${esc(j.titulo)}" referrerpolicy="no-referrer">${shots.length > 1 ? `<button class="gal-b l" id="galPrev" aria-label="Anterior">${ic('chl')}</button><button class="gal-b r" id="galNext" aria-label="Próxima">${ic('chr')}</button>` : ''}</div>
            ${shots.length > 1 ? `<div class="gal-thumbs">${shots.map((s, i) => `<button class="gal-thumb ${i ? '' : 'on'}" data-i="${i}" aria-label="Screenshot ${i + 1}"><img src="${esc(s)}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join('')}</div>` : ''}</section>` : ''}
          ${(j.positivos.length || j.negativos.length) ? `<section class="block"><div class="pcgrid">
            ${j.positivos.length ? `<div class="pros"><h3>Pontos positivos</h3><ul>${j.positivos.map(p => `<li>${ic('check')}<span>${esc(p)}</span></li>`).join('')}</ul></div>` : ''}
            ${j.negativos.length ? `<div class="cons"><h3>Pontos negativos</h3><ul>${j.negativos.map(p => `<li>${ic('xc')}<span>${esc(p)}</span></li>`).join('')}</ul></div>` : ''}</div></section>` : ''}
          ${sc ? `<div class="verdict"><div><h3>Veredito final</h3><p>${esc(j.veredito || j.fraseDestaque || 'Esta é a minha nota final para o jogo.')}</p></div><div class="vscore">${cnt(j.notas.final)}<small>/10</small></div></div>` : ''}
          <div class="duo">
            <div class="box"><h3>Sobre o autor</h3><div class="author"><div class="avatar">${avatar}</div><div><b>${esc(au.nome || CFG.SITE_NAME)}</b><p>${esc(au.bio || '')}</p></div></div></div>
            <div class="box"><h3>Compartilhe esta resenha</h3><div class="share">
              <a href="https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(pageUrl)}" target="_blank" rel="noopener" aria-label="Compartilhar no X">${ic('x')}</a>
              <a href="https://wa.me/?text=${enc(shareText + ' ' + pageUrl)}" target="_blank" rel="noopener" aria-label="Compartilhar no WhatsApp">${ic('wa')}</a>
              <button id="copyLink" aria-label="Copiar link">${ic('link')}</button></div></div>
          </div>
          ${related.length ? `<section class="block"><h2>Você também pode gostar</h2><div class="ggrid">${related.map(x => gcard(x)).join('')}</div></section>` : ''}
        </div>
      </div>`;

    const cl = $('#copyLink');
    cl.addEventListener('click', () => copyText(pageUrl).then(() => {
      toast('Link copiado!'); cl.classList.add('ok'); cl.innerHTML = ic('tick');
      setTimeout(() => { cl.classList.remove('ok'); cl.innerHTML = ic('link'); }, 1600);
    }));
    if (shots.length) {
      const main = $('#galMain'); let i = 0;
      const set = n => {
        i = (n + shots.length) % shots.length;
        main.classList.add('swap');
        setTimeout(() => { main.onload = main.onerror = () => main.classList.remove('swap'); main.src = shots[i]; setTimeout(() => main.classList.remove('swap'), 700); }, 160);
        $$('.gal-thumb').forEach((t, k) => t.classList.toggle('on', k === i));
      };
      if ($('#galPrev')) { $('#galPrev').onclick = () => set(i - 1); $('#galNext').onclick = () => set(i + 1); }
      $$('.gal-thumb').forEach(t => t.onclick = () => set(+t.dataset.i));
      main.onclick = () => openLB(shots, i);
    }
  }

  function sobre() {
    setMeta('Sobre', (CFG.ABOUT || [])[0] || '');
    const au = CFG.AUTHOR || {}, soc = socialLinks();
    const avatar = safeUrl(au.foto) ? `<img src="${esc(safeUrl(au.foto))}" alt="" referrerpolicy="no-referrer">` : esc((au.nome || CFG.SITE_NAME)[0].toUpperCase());
    app.innerHTML = `<div class="wrap page"><nav class="crumbs"><a href="#/">Início</a>${ic('chr')}<span>Sobre</span></nav>
      <div class="ph-h"><h1>Sobre o ${esc(CFG.SITE_NAME)}</h1></div>
      <div class="about"><div class="prose">${(CFG.ABOUT || []).map(p => `<p>${esc(p)}</p>`).join('') || '<p>Em breve.</p>'}</div>
        <div><div class="box"><h3>Quem escreve</h3><div class="author"><div class="avatar">${avatar}</div><div><b>${esc(au.nome || CFG.SITE_NAME)}</b><p>${esc(au.bio || '')}</p></div></div></div>
        ${soc.length ? `<div class="box" style="margin-top:16px"><h3>Vamos conversar?</h3><ul class="contact">${soc.map(o => `<li><a href="${esc(o.href)}" target="_blank" rel="noopener">${ic(o.icon)}${o.label}</a></li>`).join('')}</ul></div>` : ''}</div></div></div>`;
  }

  /* ================= lightbox / copiar ================= */
  let lbList = [], lbI = 0;
  function openLB(list, i) { lbList = list; lbI = i; showLB(); $('#lb').classList.remove('hide'); }
  function showLB() { $('#lbImg').src = lbList[lbI]; $('#lbP').style.visibility = $('#lbN').style.visibility = lbList.length > 1 ? 'visible' : 'hidden'; }
  const closeLB = () => $('#lb').classList.add('hide');
  const stepLB = d => { lbI = (lbI + d + lbList.length) % lbList.length; showLB(); };
  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    return new Promise(res => { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) {} a.remove(); res(); });
  }

  /* ================= efeitos e microinterações ================= */
  /* contador animado das notas */
  function countUp(el) {
    const to = parseFloat(el.dataset.count); if (isNaN(to)) return;
    const fmt = v => { const r = Math.round(v * 10) / 10; return r >= 10 ? '10' : r.toFixed(1); };
    const dur = 1100, t0 = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = p < 1 ? fmt(to * e) : fmt(to);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  /* aparece suavemente ao rolar a página */
  const REVEAL_SEL = '.sec,.hero,.rcard,.ggrid>.gcard,.rail .gcard,.gtile,.row,.block,.box,.verdict,.stats,.tabs,.wish,.jposter,.pcgrid li,.state,.ph-h,.filters';
  const IO = ('IntersectionObserver' in window && !REDUCED) ? new IntersectionObserver(ents => {
    ents.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target; IO.unobserve(el);
      el.classList.add('in');
      if (el.dataset && el.dataset.count != null) countUp(el);
      if (el.classList.contains('reveal')) setTimeout(() => { el.classList.remove('reveal', 'in'); el.style.removeProperty('--d'); }, 1100);
    });
  }, { threshold: .1, rootMargin: '0px 0px -5% 0px' }) : null;
  if (!IO) document.documentElement.classList.add('no-fx');
  function fx(root) {
    root = root || app;
    if (!IO) return;
    let i = 0;
    $$(REVEAL_SEL, root).forEach(el => {
      if (el.classList.contains('reveal')) return;
      el.classList.add('reveal'); el.style.setProperty('--d', (i++ % 7) * 65 + 'ms'); IO.observe(el);
    });
    $$('.scorebox,[data-count]', root).forEach(el => IO.observe(el));
  }
  function markImgs(root) {
    $$('.pic img', root || app).forEach(i => { if (i.complete && i.naturalWidth) i.classList.add('loaded'); });
  }
  /* carrosséis: esconde setas quando não há o que rolar */
  function initRails(root) {
    $$('.rail-wrap', root || app).forEach(w => {
      const r = $('.rail', w), l = $('.l', w), rr = $('.r', w);
      const upd = () => {
        const can = r.scrollWidth > r.clientWidth + 4;
        l.style.display = rr.style.display = can ? '' : 'none';
        l.disabled = r.scrollLeft <= 2; rr.disabled = r.scrollLeft + r.clientWidth >= r.scrollWidth - 2;
      };
      r.addEventListener('scroll', () => requestAnimationFrame(upd), { passive: true });
      if ('ResizeObserver' in window) new ResizeObserver(upd).observe(r);
      upd(); setTimeout(upd, 350);
    });
  }
  /* confete (código secreto) */
  function confetti() {
    if (REDUCED) return;
    const box = document.createElement('div'); box.className = 'confetti';
    const cols = ['var(--acc)', 'var(--acc2)', '#ffffff', '#fbbf24', '#f472b6'];
    for (let i = 0; i < 90; i++) {
      const p = document.createElement('i');
      p.style.cssText = `left:${Math.random() * 100}%;--t:${2.4 + Math.random() * 2}s;--dl:${Math.random() * .7}s;--r:${Math.random() * 720 - 360}deg;--dx:${Math.random() * 240 - 120}px;background:${cols[i % cols.length]};width:${6 + Math.random() * 6}px;height:${8 + Math.random() * 10}px`;
      box.appendChild(p);
    }
    document.body.appendChild(box); setTimeout(() => box.remove(), 5600);
  }

  /* brilho que segue o mouse + inclinação 3D das capas */
  if (FINE) {
    let raf = 0, last = null;
    document.addEventListener('pointermove', e => {
      last = e; if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0; const t = last.target; if (!t || !t.closest) return;
        const el = t.closest('.gcard,.rcard,.row,.gtile,.box,.jposter,.stat'); if (!el) return;
        const r = el.getBoundingClientRect(), x = last.clientX - r.left, y = last.clientY - r.top;
        el.style.setProperty('--mx', x + 'px'); el.style.setProperty('--my', y + 'px');
        if (!REDUCED && el.matches('.gcard,.jposter')) {
          el.style.setProperty('--ry', ((x / r.width - .5) * 12).toFixed(2) + 'deg');
          el.style.setProperty('--rx', (-(y / r.height - .5) * 12).toFixed(2) + 'deg');
        }
      });
    }, { passive: true });
    document.addEventListener('pointerout', e => {
      const el = e.target.closest && e.target.closest('.gcard,.jposter');
      if (el && !el.contains(e.relatedTarget)) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }
    });
  }
  /* ondinha ao clicar */
  document.addEventListener('pointerdown', e => {
    if (REDUCED) return;
    const b = e.target.closest && e.target.closest('.btn,.pager button,.share a,.share button,.fchip,.tabs a,.totop,.gal-b,.rail-btn,.lb button');
    if (!b) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2, sp = document.createElement('span');
    sp.className = 'rip'; sp.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left}px;top:${e.clientY - r.top}px`;
    b.appendChild(sp); setTimeout(() => sp.remove(), 700);
  });
  /* rolagem: barra de progresso, cabeçalho compacto, voltar ao topo, parallax */
  let ticking = false; const progEl = $('#progress i');
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
      progEl.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h).toFixed(4) : 0) + ')';
      $('#header').classList.toggle('scrolled', y > 12);
      $('#toTop').classList.toggle('show', y > 600);
      if (!REDUCED) { const bg = app.querySelector('.hero-bg'); if (bg && y < 1400) bg.style.translate = '0 ' + (y * .14).toFixed(1) + 'px'; }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  $('#toTop').innerHTML = ic('chu');
  $('#toTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }));
  /* código secreto */
  const KON = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']; let kpos = 0;
  document.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    kpos = k === KON[kpos] ? kpos + 1 : (k === KON[0] ? 1 : 0);
    if (kpos === KON.length) { kpos = 0; confetti(); toast('+30 vidas! Código secreto ativado'); }
  });

  /* ================= roteador ================= */
  function route(scroll) {
    if (!loaded) return;
    const h = location.hash.replace(/^#\/?/, '');
    const qi = h.indexOf('?');
    const path = qi < 0 ? h : h.slice(0, qi), q = new URLSearchParams(qi < 0 ? '' : h.slice(qi + 1));
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    const [a, b] = parts;
    const navKey = { jogo: 'resenhas', genero: 'generos' }[a] || a || 'inicio';
    setNav(navKey); document.body.classList.remove('menu');
    switch (a) {
      case undefined: home(); break;
      case 'resenhas': listPage(q); break;
      case 'generos': generos(); break;
      case 'genero': b ? listPage(q, b) : generos(); break;
      case 'listas': listas(b); break;
      case 'jogo': jogo(b); break;
      case 'sobre': sobre(); break;
      default: setMeta('Página não encontrada'); app.innerHTML = emptyBtn('Página não encontrada', 'O endereço não existe.', '#/', 'Voltar ao início');
    }
    renderFooter();
    if (!REDUCED) { app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter'); }
    fx(app); initRails(app); markImgs(app);
    if (scroll) window.scrollTo(0, 0);
    onScroll();
  }

  /* ================= carregamento ================= */
  function setData(d, scroll) {
    const sig = JSON.stringify(d);
    if (loaded && sig === lastSig) return;
    lastSig = sig;
    if (d.site) { applySite(d.site); try { localStorage.setItem('junigami:site', JSON.stringify(d.site)); } catch (e) {} }
    DATA = { jogos: (Array.isArray(d.jogos) ? d.jogos : []).filter(j => j && j.titulo).map(normalize), tema: d.tema || null };
    if (DATA.tema) applyTheme(DATA.tema);
    const first = !loaded; loaded = true;
    renderChrome();
    route(first || scroll);
    if (first && window.__splashDone) window.__splashDone();
  }
  function showError(msg) {
    loaded = false;
    app.innerHTML = `<div class="state"><h2>Não foi possível carregar</h2><p>${esc(msg)}</p><button class="btn primary" id="retry">Tentar de novo</button></div>`;
    $('#retry').onclick = () => { app.innerHTML = ''; load(); };
    if (window.__splashDone) window.__splashDone();
  }
  async function load() {
    DEMO = !CFG.API_URL || /COLE_AQUI/i.test(CFG.API_URL);
    if (DEMO) {
      if (window.DEMO_DATA) {
        const bar = $('#demo-bar'); bar.textContent = 'Modo demonstração: jogos fictícios. Cole a URL do Apps Script em config.js para mostrar os jogos reais.'; bar.classList.remove('hide');
        setData(window.DEMO_DATA);
      } else showError('Configure a API_URL no arquivo config.js.');
      return;
    }
    const KEY = 'junigami:dados';
    if (!loaded) { try { const c = JSON.parse(localStorage.getItem(KEY) || 'null'); if (c && Array.isArray(c.jogos)) setData(c); } catch (e) {} }
    try {
      const sep = CFG.API_URL.indexOf('?') < 0 ? '?' : '&';
      const r = await fetch(CFG.API_URL + sep + 'api=tudo', { cache: 'no-store' });
      const d = await r.json();
      if (!d || !Array.isArray(d.jogos)) throw new Error('Resposta inesperada da API.');
      try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
      setData(d);
    } catch (e) {
      if (!loaded) showError('Confira se a URL em config.js está certa e se o app do Apps Script foi publicado com acesso para "Qualquer pessoa". (' + (e.message || e) + ')');
    }
  }

  /* ================= eventos globais ================= */
  document.addEventListener('load', e => { const t = e.target; if (t && t.tagName === 'IMG' && t.closest && t.closest('.pic')) t.classList.add('loaded'); }, true);
  document.addEventListener('error', e => { const t = e.target; if (t && t.tagName === 'IMG' && t.closest && t.closest('.pic')) t.remove(); }, true);
  setTimeout(() => $$('.pic img').forEach(i => i.classList.add('loaded')), 6000); /* segurança */
  document.addEventListener('click', e => {
    const rb = e.target.closest('[data-rail]');
    if (rb) { const rl = rb.parentElement.querySelector('.rail'); rl.scrollBy({ left: +rb.dataset.rail * rl.clientWidth * .85, behavior: 'smooth' }); }
    const z = e.target.closest('[data-zoom]');
    if (z) { const u = safeUrl((J().find(x => String(x.id) === decodeURIComponent((location.hash.split('/')[2] || '').split('?')[0])) || {}).capa); if (u) openLB([u], 0); }
  });
  document.addEventListener('keydown', e => {
    const z = e.target.closest && e.target.closest('[data-zoom]');
    if (z && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); z.click(); }
  });
  $('#lbX').onclick = closeLB; $('#lbP').onclick = () => stepLB(-1); $('#lbN').onclick = () => stepLB(1);
  $('#lb').addEventListener('click', e => { if (e.target.id === 'lb') closeLB(); });
  document.addEventListener('keydown', e => {
    if ($('#lb').classList.contains('hide')) return;
    if (e.key === 'Escape') closeLB(); else if (e.key === 'ArrowLeft') stepLB(-1); else if (e.key === 'ArrowRight') stepLB(1);
  });
  window.addEventListener('hashchange', () => route(true));

  /* início: aplica o último site salvo (para o nome certo aparecer logo) e carrega os dados */
  try { const cs = JSON.parse(localStorage.getItem('junigami:site') || 'null'); if (cs) applySite(cs); } catch (e) {}
  renderChrome();
  load();
  setInterval(() => { if (!DEMO && !document.hidden) load(); }, 5 * 60 * 1000); // atualiza sozinho a cada 5 min
})();
