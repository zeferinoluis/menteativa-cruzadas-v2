/**
 * app.js — Interface de utilizador e inicializacao das Palavras Cruzadas.
 * Depende de: config.js, storage.js, generator.js
 */
var CruzadasApp = window.CruzadasApp || {};

// ─── Globais de jogo ───
var cur = null;         // configuracao do puzzle actual
var grelha = null;      // matriz de celulas
var seleccao = null;    // [r, c] da celula seleccionada
var direccao = 'H';     // direccao actual ('H'ou 'V')
var pausado = false;
var segundos = 0;
var temporizador = null;
var revelado = false;
var finalizado = false;

// ─── Dicionario carregado externamente ───
CruzadasApp.DICIONARIO = null;

// ─── Inicializacao ───
function initApp() {
  CruzadasApp.MotorGrelhas = CruzadasApp.MotorGrelhas || {};
  CruzadasApp.ARMAZEM = CruzadasApp.ARMAZEM || {};

  mostrarLoading(true);
  carregarDicionario();
}

function mostrarLoading(visivel) {
  var el = document.getElementById('loadingOverlay');
  if (el) {
    if (visivel) {
      el.classList.remove('pronto');
      el.style.display = 'flex';
    } else {
      el.classList.add('pronto');
      setTimeout(function () { el.style.display = 'none'; }, 400);
    }
  }
}

function carregarDicionario() {
  var url = 'dicionario.json';
  var fallbackUsado = false;

  fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      CruzadasApp.DICIONARIO = data;
      inicializarUI();
    })
    .catch(function (err) {
      console.warn('Nao foi possivel carregar dicionario.json:', err);
      if (!fallbackUsado) {
        fallbackUsado = true;
        // Tenta carregar de um caminho alternativo (para GitHub Pages)
        return fetch('./dicionario.json?' + Date.now());
      }
      throw err;
    })
    .then(function (res) {
      if (res && !res.ok) throw new Error('Fallback HTTP ' + res.status);
      if (res) return res.json();
    })
    .then(function (data) {
      if (data) {
        CruzadasApp.DICIONARIO = data;
        inicializarUI();
      }
    })
    .catch(function () {
      // Se falhar, usa um dicionario minimo embutido para nao deixar a app quebrada
      CruzadasApp.DICIONARIO = gerarDicionarioMinimo();
      console.warn('A usar dicionario minimo embutido.');
      inicializarUI();
    });
}

function gerarDicionarioMinimo() {
  return {
    "geral": {
      "facil": [
        { "w": "JOGO", "q": "Actividade ludica" },
        { "w": "CASA", "q": "Edificio de habitacao" },
        { "w": "LUZ", "q": "Radiacao visivel" },
        { "w": "ARTE", "q": "Expressao criativa" },
        { "w": "MUNDO", "q": "Planeta Terra" },
        { "w": "TEMPO", "q": "Sucessao de momentos" },
        { "w": "POVO", "q": "Habitantes de uma regiao" },
        { "w": "VIDA", "q": "Estado dos seres organizados" }
      ],
      "medio": [
        { "w": "CULTURA", "q": "Saberes de um povo" },
        { "w": "HISTORIA", "q": "Estudo do passado" },
        { "w": "CIENCIA", "q": "Conhecimento sistematico" },
        { "w": "JUSTICA", "q": "Principio de equidade" },
        { "w": "POLITICA", "q": "Arte de governar" },
        { "w": "FILOSOFIA", "q": "Investigacao do saber" }
      ],
      "dificil": [
        { "w": "PRAGMATICO", "q": "Focado em resultados" },
        { "w": "PARADOXO", "q": "Contradicao logica" },
        { "w": "RESILIENCIA", "q": "Superacao de adversidade" },
        { "w": "UTOPIA", "q": "Sociedade ideal" }
      ]
    }
  };
}

// ─── UI: CruzadasUI ───
var CruzadasUI = (function () {
  function inicializar() {
    var container = document.getElementById('gridTemas');
    var temas = CruzadasApp.CX_TEMAS;
    container.innerHTML = temas.map(function (t, idx) {
      return '<button class="cartao-tema" data-idx="' + idx + '">' +
        '<div class="cartao-selo" style="background:' + t.cor + '">' + t.icone + '</div>' +
        '<h3 class="f-display">' + t.nome + '</h3>' +
        '<p>Grelhas com c\u00E1lculo de intersec\u00F5es sem falhas estruturais.</p>' +
        '<div class="cartao-rodape"><span class="pill-progresso">Erudito Pronto</span></div>' +
        '</button>';
    }).join('');

    container.querySelectorAll('.cartao-tema').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = Number(btn.dataset.idx);
        abrirDesafio(idx, document.getElementById('selectNivelCruzadas').value);
      });
    });

    document.getElementById('selectNivelCruzadas').addEventListener('change', function (e) {
      if (cur && !finalizado) confirmarMudanca(function () { abrirDesafio(cur.temaIdx, e.target.value); });
      else if (cur) abrirDesafio(cur.temaIdx, e.target.value);
    });

    document.getElementById('btnNovoCruzadas').addEventListener('click', function () {
      if (cur && !finalizado) confirmarMudanca(function () { abrirDesafio(cur.temaIdx, cur.nivel); });
      else if (cur) abrirDesafio(cur.temaIdx, cur.nivel);
    });

    document.getElementById('btnVerificarCruzadas').addEventListener('click', verificarGrelha);
    document.getElementById('btnRevelarCruzadas').addEventListener('click', proporRevelacao);

    document.getElementById('btnVoltarCruzadas').addEventListener('click', function () {
      guardarEstadoActual();
      pararTemporizador();
      irPara('ecraInicio');
    });

    document.getElementById('botaoMarca').onclick = function () {
      irPara('ecraInicio');
    };

    document.getElementById('btnCancelarLimpar').onclick = function () { fecharModal('modalLimpar'); };
    document.getElementById('btnConfirmarLimpar').onclick = function () {
      CruzadasApp.ARMAZEM.limparTudo();
      window.location.reload();
    };
    document.getElementById('btnLimparTopo').onclick = function () { abrirModal('modalLimpar'); };
    document.getElementById('btnGuardarTopo').onclick = function () {
      guardarEstadoActual();
      lancarToast('Progresso guardado localmente.', 'sucesso');
    };

    document.getElementById('btnConclusaoNovo').onclick = function () {
      fecharModal('modalConclusao');
      abrirDesafio(cur.temaIdx, cur.nivel);
    };
    document.getElementById('btnConclusaoMenu').onclick = function () {
      fecharModal('modalConclusao');
      irPara('ecraInicio');
    };

    // Restaurar estado anterior
    var salvo = CruzadasApp.ARMAZEM.ler(CruzadasApp.CHAVE_ESTADO);
    if (salvo && salvo.cur && salvo.grelha) {
      restaurarEstado(salvo);
    }
  }

  // ─── Gestao de ecras ───
  function irPara(id) {
    document.querySelectorAll('.ecra').forEach(function (e) { e.classList.remove('activo'); });
    var el = document.getElementById(id);
    if (el) el.classList.add('activo');
  }

  function abrirModal(id) {
    var m = document.getElementById(id);
    if (m) {
      m.classList.add('aberto');
      m.addEventListener('touchmove', preventScroll, { passive: false });
    }
  }

  function fecharModal(id) {
    var m = document.getElementById(id);
    if (m) {
      m.classList.remove('aberto');
      m.removeEventListener('touchmove', preventScroll);
    }
  }

  function preventScroll(e) {
    if (e.target.classList.contains('modal-fundo')) {
      e.preventDefault();
    }
  }

  function lancarToast(msg, tipo) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'mostrar' + (tipo ? ' ' + tipo : '');
    setTimeout(function () { t.classList.remove('mostrar'); }, 3000);
  }

  function confirmarMudanca(onSim) {
    abrirModal('modalConfirmar');
    document.getElementById('btnConfirmarSim').onclick = function () {
      fecharModal('modalConfirmar');
      onSim();
    };
    document.getElementById('btnConfirmarNao').onclick = function () {
      fecharModal('modalConfirmar');
    };
  }

  // ─── Abertura de puzzle ───
  function abrirDesafio(temaIdx, nivel) {
    var tema = CruzadasApp.CX_TEMAS[temaIdx];
    var dict = CruzadasApp.DICIONARIO;
    if (!dict || !dict[tema.id] || !dict[tema.id][nivel]) {
      lancarToast('Dicionario nao carregado para este tema/nivel.', 'erro');
      return;
    }

    var listaPalavrasTema = dict[tema.id][nivel];
    if (listaPalavrasTema.length === 0) {
      lancarToast('Nao existem palavras configuradas para este nivel.', 'erro');
      return;
    }

    var maxPalavras = Math.min(8, listaPalavrasTema.length);
    var dimensoes = CruzadasApp.MotorGrelhas.gerar(listaPalavrasTema, maxPalavras);

    if (!dimensoes) {
      // Tenta com menos palavras
      dimensoes = CruzadasApp.MotorGrelhas.gerar(listaPalavrasTema, 4);
    }

    if (!dimensoes || dimensoes.words.length < 2) {
      lancarToast('Nao foi possivel gerar uma grelha com estas palavras. Tente outro nivel.', 'erro');
      return;
    }

    cur = {
      temaIdx: temaIdx,
      id: tema.id,
      nome: tema.nome,
      nivel: nivel,
      size: dimensoes.size,
      nrows: dimensoes.nrows,
      rows: dimensoes.rows,
      words: dimensoes.words
    };

    // Construir matriz de celulas
    grelha = [];
    for (var r = 0; r < cur.nrows; r++) {
      grelha.push([]);
      for (var c = 0; c < cur.size; c++) {
        var isBloco = cur.rows[r][c] === '.';
        grelha[r].push({
          bloco: isBloco,
          resposta: isBloco ? '' : normalizarLetra(cur.rows[r][c]),
          utilizador: '',
          num: 0
        });
      }
    }

    // Numerar celulas
    var n = 1;
    cur.words.forEach(function (w) {
      if (grelha[w.r] && grelha[w.r][w.c] && !grelha[w.r][w.c].bloco && grelha[w.r][w.c].num === 0) {
        grelha[w.r][w.c].num = n++;
      }
    });

    seleccao = null;
    direccao = 'H';
    pausado = false;
    segundos = 0;
    revelado = false;
    finalizado = false;

    document.getElementById('cruzadasSubtitulo').textContent = tema.nome + ' \u00B7 N\u00EDvel ' + cur.nivel.toUpperCase();
    var selo = document.getElementById('seloTemaActivo');
    selo.textContent = tema.icone;
    selo.style.background = tema.cor;

    irPara('ecraCruzadas');
    renderizarTabuleiro();
    iniciarTemporizador();
    guardarEstadoActual();
  }

  // ─── Persistencia de estado ───
  function guardarEstadoActual() {
    if (cur && grelha) {
      CruzadasApp.ARMAZEM.guardar(CruzadasApp.CHAVE_ESTADO, {
        cur: cur,
        grelha: grelha,
        seleccao: seleccao,
        direccao: direccao,
        segundos: segundos,
        revelado: revelado,
        finalizado: finalizado
      });
    }
  }

  function restaurarEstado(s) {
    cur = s.cur;
    grelha = s.grelha;
    seleccao = s.seleccao;
    direccao = s.direccao;
    segundos = s.segundos;
    revelado = s.revelado;
    finalizado = s.finalizado;
    pausado = false;

    if (!cur) return;

    document.getElementById('selectNivelCruzadas').value = cur.nivel;
    document.getElementById('cruzadasSubtitulo').textContent = cur.nome + ' \u00B7 N\u00EDvel ' + cur.nivel.toUpperCase();
    var tema = CruzadasApp.CX_TEMAS[cur.temaIdx];
    if (tema) {
      var selo = document.getElementById('seloTemaActivo');
      selo.textContent = tema.icone;
      selo.style.background = tema.cor;
    }

    irPara('ecraCruzadas');
    renderizarTabuleiro();
    if (revelado || finalizado) {
      bloquearGrelhaCompleta();
    } else {
      iniciarTemporizador();
    }
  }

  // ─── Renderizacao do tabuleiro ───
  function renderizarTabuleiro() {
    var area = document.getElementById('areaCruzadas');
    area.innerHTML =
      '<div class="cx-barra-progresso-wrap"><div class="cx-barra-progresso-fill" id="cxBarraFill"></div></div>' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">' +
      '  <div class="f-corpo" style="display:flex; gap:16px; font-size:14px; color:var(--tinta-suave);">' +
      '    <span>\u23F1\uFE0F <b id="cxTimer">00:00</b></span>' +
      '    <span>\u2713 <b id="cxFeitas">0</b>/<b id="cxTotal">0</b> palavras</span>' +
      '  </div>' +
      '  <button class="btn btn-fantasma" id="btnPausaCruzadas">\u23F8\uFE0F Pausa</button>' +
      '</div>' +
      '<div class="cx-layout">' +
      '  <div class="cx-tabuleiro-wrap">' +
      '    <div class="cx-tabuleiro" id="cxTabuleiro">' +
      '      <div class="cx-grelha" id="cxGrelha"></div>' +
      '      <div class="cx-pausa-cobertura" id="cxPausaCobertura">' +
      '        <div style="font-size:32px;">\u23F8\uFE0F</div>' +
      '        <div class="f-display" style="font-size:16px;">Grelha Ocultada</div>' +
      '        <button class="btn btn-primario" id="btnContinuarCruzadas">\u25B6\uFE0F Retomar</button>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="cx-pistas">' +
      '    <div class="cx-grupo-pistas"><div class="cx-grupo-titulo">Horizontais</div><div id="cxPistasH"></div></div>' +
      '    <div class="cx-grupo-pistas"><div class="cx-grupo-titulo">Verticais</div><div id="cxPistasV"></div></div>' +
      '  </div>' +
      '</div>';

    document.getElementById('btnPausaCruzadas').onclick = alternarPausa;
    document.getElementById('btnContinuarCruzadas').onclick = alternarPausa;

    var elG = document.getElementById('cxGrelha');
    elG.style.gridTemplateColumns = 'repeat(' + cur.size + ', 1fr)';
    elG.innerHTML = '';

    for (var r = 0; r < cur.nrows; r++) {
      for (var c = 0; c < cur.size; c++) {
        var cel = grelha[r][c];
        var div = document.createElement('div');
        div.className = 'cx-celula' + (cel.bloco ? ' bloco' : '');
        div.dataset.r = r;
        div.dataset.c = c;

        if (!cel.bloco) {
          if (cel.num > 0) {
            var sp = document.createElement('span');
            sp.className = 'num';
            sp.textContent = cel.num;
            div.appendChild(sp);
          }
          var inp = document.createElement('input');
          inp.type = 'text';
          inp.maxLength = 1;
          inp.value = cel.utilizador;
          inp.setAttribute('autocomplete', 'off');
          inp.setAttribute('spellcheck', 'false');

          inp.addEventListener('focus', (function (rr, cc) {
            return function () { estabelecerFoco(rr, cc); };
          })(r, c));
          inp.addEventListener('keydown', (function (rr, cc) {
            return function (e) { tratarTeclado(e, rr, cc); };
          })(r, c));
          inp.addEventListener('beforeinput', (function (rr, cc) {
            return function (e) { tratarAntesDeInserir(e, rr, cc); };
          })(r, c));
          inp.addEventListener('input', (function (rr, cc) {
            return function (e) { tratarInsercao(e, rr, cc); };
          })(r, c));
          inp.addEventListener('click', (function (rr, cc) {
            return function () { tratarClique(rr, cc); };
          })(r, c));

          div.appendChild(inp);
        }
        elG.appendChild(div);
      }
    }

    actualizarPistasLayout();
    actualizarMetricas();
    renderTemporizador();
    ajustarTamanhoCelulas();
  }

  // ─── Tamanho das celulas ───
  function ajustarTamanhoCelulas(alturaJanela) {
    if (!cur) return;
    var wrap = document.querySelector('.cx-tabuleiro-wrap');
    if (!wrap || !wrap.clientWidth) return;
    var larguraDisponivel = wrap.clientWidth - 16;
    var alturaEcra = alturaJanela || window.innerHeight;
    var rectWrap = wrap.getBoundingClientRect();
    var alturaDisponivel = (alturaEcra - rectWrap.top) - 16;
    var tamCol = larguraDisponivel / cur.size;
    var tamLin = alturaDisponivel / cur.nrows;
    var tam = Math.floor(Math.min(tamCol, tamLin));
    if (!Number.isFinite(tam)) tam = 32;
    tam = Math.max(26, Math.min(40, tam));
    document.documentElement.style.setProperty('--cel-tam', tam + 'px');
  }

  // ─── Acesso a celulas ───
  function obterDiv(r, c) {
    return document.querySelector('.cx-celula[data-r="' + r + '"][data-c="' + c + '"]');
  }

  function obterInput(r, c) {
    var d = obterDiv(r, c);
    return d ? d.querySelector('input') : null;
  }

  function obterCelulasDaPalavra(w) {
    var o = [];
    for (var i = 0; i < w.w.length; i++) {
      o.push(w.d === 'H' ? [w.r, w.c + i] : [w.r + i, w.c]);
    }
    return o;
  }

  function obterPalavraNaPosicao(r, c, dir) {
    var words = cur.words;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (w.d !== dir) continue;
      var celulas = obterCelulasDaPalavra(w);
      for (var j = 0; j < celulas.length; j++) {
        if (celulas[j][0] === r && celulas[j][1] === c) return w;
      }
    }
    return null;
  }

  function estaCompletada(w) {
    var celulas = obterCelulasDaPalavra(w);
    for (var i = 0; i < celulas.length; i++) {
      var rr = celulas[i][0], cc = celulas[i][1];
      if (grelha[rr][cc].utilizador !== grelha[rr][cc].resposta) return false;
    }
    return true;
  }

  // ─── Realce de interface ───
  function realcarInterface() {
    document.querySelectorAll('.cx-celula').forEach(function (el) {
      el.classList.remove('letra-activa', 'palavra-activa');
    });

    if (!seleccao) return;
    var r = seleccao[0], c = seleccao[1];
    var w = obterPalavraNaPosicao(r, c, direccao);
    if (w) {
      obterCelulasDaPalavra(w).forEach(function (coord) {
        var d = obterDiv(coord[0], coord[1]);
        if (d) d.classList.add('palavra-activa');
      });
    }
    var d = obterDiv(r, c);
    if (d) {
      d.classList.add('letra-activa');
      d.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    document.querySelectorAll('.cx-pista').forEach(function (p) { p.classList.remove('activa'); });
    if (w) {
      var elP = document.querySelector('.cx-pista[data-key="' + w.r + ',' + w.c + ',' + w.d + '"]');
      if (elP) {
        elP.classList.add('activa');
        elP.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  // ─── Manuseamento de eventos ───
  function estabelecerFoco(r, c) {
    if (pausado || revelado || finalizado) return;
    if (!seleccao || seleccao[0] !== r || seleccao[1] !== c) {
      if (!obterPalavraNaPosicao(r, c, direccao)) {
        direccao = (direccao === 'H') ? 'V' : 'H';
      }
      seleccao = [r, c];
      realcarInterface();
    }
  }

  function tratarClique(r, c) {
    if (pausado || revelado || finalizado) return;
    if (seleccao && seleccao[0] === r && seleccao[1] === c) {
      var outraDir = (direccao === 'H') ? 'V' : 'H';
      if (obterPalavraNaPosicao(r, c, outraDir)) direccao = outraDir;
    }
    seleccao = [r, c];
    realcarInterface();
  }

  function obterCelulaVizinha(r, c, dir, sentido) {
    var rr = r, cc = c;
    while (true) {
      if (dir === 'H') cc += sentido;
      else rr += sentido;
      if (rr < 0 || cc < 0 || rr >= cur.nrows || cc >= cur.size) return null;
      if (!grelha[rr][cc].bloco) return [rr, cc];
    }
  }

  function avancarCursor(r, c) {
    var prox = obterCelulaVizinha(r, c, direccao, 1);
    if (prox) {
      seleccao = prox;
      realcarInterface();
      var inp = obterInput(prox[0], prox[1]);
      if (inp) inp.focus({ preventScroll: true });
    }
  }

  function recuarCursor(r, c) {
    var ant = obterCelulaVizinha(r, c, direccao, -1);
    if (ant) {
      seleccao = ant;
      realcarInterface();
      var inp = obterInput(ant[0], ant[1]);
      if (inp) inp.focus({ preventScroll: true });
    }
  }

  function tratarAntesDeInserir(e, r, c) {
    if (pausado || revelado || finalizado) return;
    if (e.isComposing) return;
    var txt = e.data;
    if (!txt) return;
    var novaLetra = normalizarLetra(txt.slice(-1));
    if (!novaLetra) return;
    if (grelha[r][c].utilizador === novaLetra) {
      e.preventDefault();
      avancarCursor(r, c);
    }
  }

  function tratarInsercao(e, r, c) {
    if (pausado || revelado || finalizado) {
      e.target.value = grelha[r][c].utilizador;
      return;
    }
    var letra = normalizarLetra(e.target.value.slice(-1));
    e.target.value = letra;
    grelha[r][c].utilizador = letra;
    sincronizarConformidadePistas();
    actualizarMetricas();
    verificarFimDeJogo();
    if (letra && !finalizado) avancarCursor(r, c);
  }

  function tratarTeclado(e, r, c) {
    if (pausado || revelado || finalizado) {
      e.preventDefault();
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (grelha[r][c].utilizador !== '') {
        grelha[r][c].utilizador = '';
        var inp = obterInput(r, c);
        if (inp) inp.value = '';
        sincronizarConformidadePistas();
        actualizarMetricas();
      } else {
        recuarCursor(r, c);
        if (seleccao) {
          grelha[seleccao[0]][seleccao[1]].utilizador = '';
          var inp2 = obterInput(seleccao[0], seleccao[1]);
          if (inp2) inp2.value = '';
          sincronizarConformidadePistas();
          actualizarMetricas();
        }
      }
      return;
    }
    if (e.key === 'ArrowRight') { e.preventDefault(); direccao = 'H'; avancarCursor(r, c); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); direccao = 'H'; recuarCursor(r, c); }
    if (e.key === 'ArrowDown') { e.preventDefault(); direccao = 'V'; avancarCursor(r, c); }
    if (e.key === 'ArrowUp') { e.preventDefault(); direccao = 'V'; recuarCursor(r, c); }
  }

  // ─── Pistas ───
  function actualizarPistasLayout() {
    var elH = document.getElementById('cxPistasH');
    var elV = document.getElementById('cxPistasV');
    elH.innerHTML = '';
    elV.innerHTML = '';

    var ordenadas = [];
    cur.words.forEach(function (w) {
      var num = grelha[w.r][w.c].num;
      if (num > 0) ordenadas.push({ w: w, num: num });
    });
    ordenadas.sort(function (a, b) { return a.num - b.num; });

    ordenadas.forEach(function (item) {
      var w = item.w, num = item.num;
      var div = document.createElement('div');
      div.className = 'cx-pista' + (estaCompletada(w) ? ' feita' : '');
      div.dataset.key = w.r + ',' + w.c + ',' + w.d;
      div.innerHTML = '<span class="num">' + num + '.</span><span>' + w.q + ' <i style="font-size:11px; opacity:0.75;">(' + w.w.length + ' let.)</i></span>';
      div.onclick = function () {
        if (revelado || finalizado) return;
        seleccao = [w.r, w.c];
        direccao = w.d;
        realcarInterface();
        var inp = obterInput(w.r, w.c);
        if (inp) inp.focus({ preventScroll: true });
      };
      if (w.d === 'H') elH.appendChild(div);
      else elV.appendChild(div);
    });
  }

  function sincronizarConformidadePistas() {
    cur.words.forEach(function (w) {
      var el = document.querySelector('.cx-pista[data-key="' + w.r + ',' + w.c + ',' + w.d + '"]');
      if (el) el.classList.toggle('feita', estaCompletada(w));
    });
  }

  // ─── Metricas ───
  function actualizarMetricas() {
    if (!cur) return;
    var completas = 0;
    for (var i = 0; i < cur.words.length; i++) {
      if (estaCompletada(cur.words[i])) completas++;
    }
    document.getElementById('cxFeitas').textContent = completas;
    document.getElementById('cxTotal').textContent = cur.words.length;
    document.getElementById('cxBarraFill').style.width = (completas / cur.words.length * 100) + '%';
  }

  // ─── Fim de jogo ───
  function verificarFimDeJogo() {
    if (!cur || revelado || finalizado) return;
    for (var i = 0; i < cur.words.length; i++) {
      if (!estaCompletada(cur.words[i])) return;
    }
    finalizado = true;
    pararTemporizador();
    bloquearGrelhaCompleta();
    var m = Math.floor(segundos / 60);
    var s = segundos % 60;
    document.getElementById('textoConclusao').textContent =
      'Desafio superado com sucesso em ' + m + 'm e ' + s + 's.';
    abrirModal('modalConclusao');
    guardarEstadoActual();
  }

  // ─── Verificacao ───
  function verificarGrelha() {
    if (!cur || finalizado || revelado) return;
    var certas = 0, erradas = 0;
    for (var r = 0; r < cur.nrows; r++) {
      for (var c = 0; c < cur.size; c++) {
        var cel = grelha[r][c];
        if (cel.bloco || !cel.utilizador) continue;
        var div = obterDiv(r, c);
        if (cel.utilizador === cel.resposta) {
          certas++;
          div.classList.add('certo');
        } else {
          erradas++;
          div.classList.add('errado');
        }
      }
    }
    if (!certas && !erradas) {
      lancarToast('Preencha letras antes de validar.', 'erro');
      return;
    }
    lancarToast(
      erradas === 0
        ? 'Excelente! ' + certas + ' corretas.'
        : certas + ' corretas e ' + erradas + ' incorretas.',
      erradas > 0 ? 'erro' : 'sucesso'
    );
    setTimeout(function () {
      document.querySelectorAll('.cx-celula').forEach(function (el) {
        el.classList.remove('certo', 'errado');
      });
      realcarInterface();
    }, 2000);
  }

  // ─── Revelacao ───
  function proporRevelacao() {
    if (!cur || finalizado || revelado) return;
    abrirModal('modalRevelar');
    document.getElementById('btnConfirmarRevelar').onclick = function () {
      fecharModal('modalRevelar');
      revelado = true;
      pararTemporizador();
      for (var r = 0; r < cur.nrows; r++) {
        for (var c = 0; c < cur.size; c++) {
          if (!grelha[r][c].bloco) {
            grelha[r][c].utilizador = grelha[r][c].resposta;
            var inp = obterInput(r, c);
            if (inp) inp.value = grelha[r][c].resposta;
          }
        }
      }
      bloquearGrelhaCompleta();
      actualizarPistasLayout();
      actualizarMetricas();
      guardarEstadoActual();
    };
    document.getElementById('btnCancelarRevelar').onclick = function () {
      fecharModal('modalRevelar');
    };
  }

  function bloquearGrelhaCompleta() {
    document.querySelectorAll('.cx-celula input').forEach(function (inp) {
      inp.readOnly = true;
      inp.tabIndex = -1;
    });
    seleccao = null;
    realcarInterface();
  }

  // ─── Pausa ───
  function alternarPausa() {
    if (!cur || revelado || finalizado) return;
    pausado = !pausado;
    if (pausado) pararTemporizador();
    else iniciarTemporizador();
    document.getElementById('cxPausaCobertura').classList.toggle('aberta', pausado);
    document.getElementById('btnPausaCruzadas').textContent = pausado ? '\u25B6\uFE0F Retomar' : '\u23F8\uFE0F Pausa';
  }

  // ─── Temporizador ───
  function iniciarTemporizador() {
    pararTemporizador();
    if (!pausado && !revelado && !finalizado) {
      temporizador = setInterval(function () {
        segundos++;
        renderTemporizador();
      }, 1000);
    }
  }

  function pararTemporizador() {
    if (temporizador) clearInterval(temporizador);
    temporizador = null;
  }

  function renderTemporizador() {
    var el = document.getElementById('cxTimer');
    if (el) {
      el.textContent =
        String(Math.floor(segundos / 60)).padStart(2, '0') + ':' +
        String(segundos % 60).padStart(2, '0');
    }
  }

  // API publica
  return {
    inicializar: inicializar,
    abrirModal: abrirModal,
    fecharModal: fecharModal,
    ajustarTamanhoCelulas: ajustarTamanhoCelulas
  };
})();

// ─── Funcoes globais (acessiveis via onclick em HTML) ───
function irPara(id) {
  document.querySelectorAll('.ecra').forEach(function (e) { e.classList.remove('activo'); });
  var el = document.getElementById(id);
  if (el) el.classList.add('activo');
}

function abrirModal(id) { CruzadasUI.abrirModal(id); }
function fecharModal(id) { CruzadasUI.fecharModal(id); }

function lancarToast(msg, tipo) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'mostrar' + (tipo ? ' ' + tipo : '');
  setTimeout(function () { t.classList.remove('mostrar'); }, 3000);
}

function normalizarLetra(c) {
  return (c || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z]/g, '');
}

// ─── Viewport ───
var larguraBase = window.innerWidth;

function actualizarViewportVisual() {
  var vv = window.visualViewport;
  var altura = vv ? vv.height : window.innerHeight;
  document.documentElement.style.setProperty('--vvh', altura + 'px');

  if (window.innerWidth !== larguraBase) {
    larguraBase = window.innerWidth;
    CruzadasUI.ajustarTamanhoCelulas(window.innerHeight);
  }
}

// ─── Inicializacao ───
function inicializarUI() {
  mostrarLoading(false);

  actualizarViewportVisual();
  CruzadasUI.inicializar();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js')
        .then(function (reg) { console.log('Service Worker registado:', reg.scope); })
        .catch(function (err) { console.error('Falha SW:', err); });
    });
  }
}

// ─── Eventos de viewport ───
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', actualizarViewportVisual);
  window.visualViewport.addEventListener('scroll', actualizarViewportVisual);
} else {
  window.addEventListener('resize', actualizarViewportVisual);
}

// Arranque
document.addEventListener('DOMContentLoaded', initApp);
