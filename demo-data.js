/* Dados de DEMONSTRAÇÃO (jogos fictícios).
   Só aparecem enquanto API_URL, em config.js, não estiver preenchida.
   Depois de ligar a planilha, você pode apagar este arquivo
   (e a linha <script src="demo-data.js"> do index.html). */
(function () {
  function notas(g, h, a, s, d) {
    var v = [g, h, a, s, d].filter(function (x) { return x != null; });
    var f = v.length ? Math.round(v.reduce(function (x, y) { return x + y; }, 0) / v.length * 10) / 10 : null;
    return { gameplay: g, historia: h, direcaoArtistica: a, som: s, designEExp: d, final: f };
  }
  function J(o) { return o; }

  window.DEMO_DATA = {
    tema: { acc: '#b4f03b', acc2: '#8b6cff' },
    jogos: [
      J({
        id: 1, titulo: 'Reino das Cinzas', subtitulo: 'Uma obra-prima do começo ao fim', desenvolvedora: 'Estúdio Brasa',
        lancamento: '2025-02-25', plataformas: ['PC', 'PlayStation 5'], generos: ['RPG', 'Ação'], classificacao: '16',
        capa: '', sinopse: 'Em um mundo devastado por uma chama eterna, você é o último portador das cinzas. Explore ruínas imensas, enfrente chefes colossais e descubra por que o reino caiu.',
        screenshots: [], status: '100% / Platinado', top10: 1, destaque: true,
        notas: notas(9.5, 9, 10, 9.5, 9), tempoJogo: 85, dificuldade: 'Desafiador', replay: 'Alto', recomendo: 'Sim',
        positivos: ['Mundo vasto e cheio de segredos', 'Chefes épicos e desafiadores', 'Trilha sonora memorável', 'Liberdade de exploração'],
        negativos: ['Curva de aprendizado pesada', 'Interface confusa no início'],
        fraseDestaque: 'Não é apenas um jogo: é uma jornada que redefine o que é liberdade.',
        veredito: 'Um marco no gênero. Desafiador, belo e cheio de possibilidades, vale cada minuto investido.',
        resenha: 'Descobrir cada canto das terras em ruínas foi viciante. A liberdade para explorar e enfrentar os desafios do meu jeito me manteve jogando por semanas.\n\nA história é contada em pedaços, com poucas palavras e muita atmosfera. Cada vitória parece merecida e a sensação de superação é difícil de encontrar em outro lugar.',
        data: '2026-11-10T14:00:00.000Z'
      }),
      J({
        id: 2, titulo: 'Vale dos Ecos', subtitulo: 'Uma jornada entre pai e filha', desenvolvedora: 'Quietude Games',
        lancamento: '2024-05-20', plataformas: ['PlayStation 5', 'PC'], generos: ['Aventura', 'Narrativo'], classificacao: '14',
        capa: '', sinopse: 'Uma travessia emocionante por montanhas silenciosas, onde cada eco revela um pedaço da memória de uma família.',
        screenshots: [], status: 'Finalizado', top10: 2, destaque: false,
        notas: notas(8, 10, 9.5, 10, 9), tempoJogo: 22, dificuldade: 'Fácil', replay: 'Médio', recomendo: 'Sim',
        positivos: ['História emocionante', 'Trilha sonora linda'], negativos: ['Final um pouco apressado'],
        fraseDestaque: 'Um jogo para sentir, não só para jogar.', veredito: 'Curto, intenso e inesquecível.',
        resenha: 'Poucas vezes um jogo me deixou tão em silêncio no fim. A relação entre os personagens é o coração de tudo.',
        data: '2026-10-28T20:00:00.000Z'
      }),
      J({
        id: 3, titulo: 'Neon Rebel', subtitulo: 'Tiro, ritmo e muito neon', desenvolvedora: 'Pulso Digital',
        lancamento: '2025-09-12', plataformas: ['PC', 'Xbox Series'], generos: ['Ação', 'Tiro', 'Indie'], classificacao: '16',
        capa: '', sinopse: 'Um shooter frenético em primeira pessoa onde cada tiro precisa acompanhar a batida da música.',
        screenshots: [], status: 'Finalizado', top10: 3, destaque: false,
        notas: notas(9, 6.5, 9, 9.5, 8), tempoJogo: 9, dificuldade: 'Médio', replay: 'Alto', recomendo: 'Sim',
        positivos: ['Combate viciante', 'Visual marcante'], negativos: ['História esquecível'],
        fraseDestaque: 'Adrenalina pura em doses curtas.', veredito: 'Perfeito para sessões rápidas.',
        resenha: 'Eu entrava para jogar uma fase e saía três horas depois. O ritmo é contagiante.',
        data: '2026-10-15T18:30:00.000Z'
      }),
      J({
        id: 4, titulo: 'Cozy Farm Galaxy', subtitulo: 'Fazenda, aliens e paz', desenvolvedora: 'Trigo & Estrelas',
        lancamento: '2023-03-03', plataformas: ['Nintendo Switch', 'PC'], generos: ['Simulação', 'Indie'], classificacao: 'L',
        capa: '', sinopse: 'Cuide da sua fazenda em um planeta distante e faça amizade com os vizinhos extraterrestres.',
        screenshots: [], status: 'Finalizado', top10: null, destaque: false,
        notas: notas(8.5, 7, 9, 9, 9), tempoJogo: 60, dificuldade: 'Fácil', replay: 'Médio', recomendo: 'Sim',
        positivos: ['Relaxante', 'Muito carismático'], negativos: ['Fica repetitivo depois de um tempo'],
        fraseDestaque: 'O abraço quentinho que eu precisava.', veredito: 'Ideal para desligar a cabeça.',
        resenha: 'É o tipo de jogo que eu abro depois de um dia ruim. Funciona.',
        data: '2026-09-30T12:00:00.000Z'
      }),
      J({
        id: 5, titulo: 'Lanterna Vazia', subtitulo: 'Terror em um farol abandonado', desenvolvedora: 'Maré Negra',
        lancamento: '2024-10-31', plataformas: ['PC'], generos: ['Terror', 'Sobrevivência'], classificacao: '18',
        capa: '', sinopse: 'Você é o novo faroleiro de uma ilha onde a luz nunca deveria se apagar.',
        screenshots: [], status: 'Abandonado', top10: null, destaque: false,
        notas: notas(5, 6, 8, 7, 4), tempoJogo: 4, dificuldade: 'Médio', replay: 'Baixo', recomendo: 'Não',
        positivos: ['Atmosfera incrível'], negativos: ['Controles travados', 'Sustos repetidos'],
        fraseDestaque: 'Muito clima, pouca diversão.', veredito: 'Bonito de ver, difícil de aguentar.',
        resenha: 'A ambientação é ótima, mas a jogabilidade não acompanha. Desisti na terceira noite.',
        data: '2026-09-12T22:00:00.000Z'
      }),
      J({
        id: 6, titulo: 'Marés de Aço', subtitulo: '', desenvolvedora: 'Almirantado',
        lancamento: '2025-11-01', plataformas: ['PC'], generos: ['Estratégia'], classificacao: '12',
        capa: '', sinopse: 'Comande frotas em batalhas navais táticas.',
        screenshots: [], status: 'Jogando', top10: null, destaque: false,
        notas: notas(null, null, null, null, null), tempoJogo: 12, dificuldade: '', replay: '', recomendo: '',
        positivos: [], negativos: [], fraseDestaque: '', veredito: '', resenha: '',
        data: '2026-11-05T09:00:00.000Z'
      }),
      J({
        id: 7, titulo: 'Sombras do Norte', subtitulo: '', desenvolvedora: 'Gelo Eterno',
        lancamento: '2026-03-14', plataformas: ['PlayStation 5'], generos: ['RPG', 'Mundo aberto'], classificacao: '16',
        capa: '', sinopse: 'Um RPG de mundo aberto em terras congeladas, cheio de lendas e criaturas.',
        screenshots: [], status: 'Quero jogar', top10: null, destaque: false,
        notas: notas(null, null, null, null, null), tempoJogo: null, dificuldade: '', replay: '', recomendo: '',
        positivos: [], negativos: [], fraseDestaque: '', veredito: '', resenha: '',
        data: '2026-11-12T09:00:00.000Z'
      })
    ]
  };
})();
