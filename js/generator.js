var CruzadasApp = window.CruzadasApp || {};

/**
 * MotorGrelhas — Gerador de grelhas de palavras cruzadas com algoritmo de
 * backtracking. Garante grelhas densas com multiplas intersecoes.
 *
 * Funcionamento:
 * 1. Ordena as palavras por tamanho (maiores primeiro)
 * 2. Coloca a primeira palavra no centro da grelha
 * 3. Para cada palavra seguinte, encontra TODAS as posicoes viaveis
 * 4. Usa backtracking: tenta uma posicao, recorre, se falhar tenta a seguinte
 * 5. Usa contagem de referencias para permitir desfazer (undo) sem danificar intersecoes
 */
CruzadasApp.MotorGrelhas = {
  TAMANHO_GRADE: 40,

  gerar(listaPalavras, maxPalavras) {
    if (!listaPalavras || listaPalavras.length === 0) return null;

    // Tenta com o maximo de palavras, diminui se falhar
    for (var alvo = Math.min(maxPalavras, listaPalavras.length); alvo >= 3; alvo--) {
      var resultado = this.tentarGerar(listaPalavras, alvo);
      if (resultado) return resultado;
    }
    return null;
  },

  tentarGerar(listaPalavras, alvo) {
    // Embaralha e ordena por tamanho decrescente
    var candidatas = listaPalavras.slice();
    this.embaralhar(candidatas);
    candidatas.sort(function (a, b) { return b.w.length - a.w.length; });

    // Tenta com diferentes primeiras palavras
    var primeiras = candidatas.slice(0, Math.min(5, candidatas.length));
    this.embaralhar(primeiras);

    for (var p = 0; p < primeiras.length; p++) {
      var primeira = primeiras[p];
      var grid = [];
      for (var i = 0; i < this.TAMANHO_GRADE; i++) {
        grid[i] = [];
        for (var j = 0; j < this.TAMANHO_GRADE; j++) {
          grid[i][j] = '.';
        }
      }

      // Contagem de referencias por celula (quantas palavras usam cada celula)
      var refs = {};

      var centro = Math.floor(this.TAMANHO_GRADE / 2);
      var startCol = centro - Math.floor(primeira.w.length / 2);

      for (var k = 0; k < primeira.w.length; k++) {
        grid[centro][startCol + k] = primeira.w[k];
        var ch = centro + ',' + (startCol + k);
        refs[ch] = (refs[ch] || 0) + 1;
      }

      var colocadas = [
        { w: primeira.w, q: primeira.q, r: centro, c: startCol, d: 'H' }
      ];

      var restantes = [];
      for (var r = 0; r < candidatas.length; r++) {
        if (candidatas[r].w !== primeira.w) {
          restantes.push(candidatas[r]);
        }
      }

      var sucesso = this.backtrack(grid, refs, colocadas, restantes, alvo);
      if (sucesso && colocadas.length >= 2) {
        return this.recortarGrelha(grid, colocadas);
      }
    }
    return null;
  },

  backtrack(grid, refs, colocadas, restantes, alvo) {
    if (colocadas.length >= alvo) return true;
    if (restantes.length === 0) return colocadas.length >= 2;

    // Encontrar todas as posicoes possiveis para as palavras restantes
    var possibilidades = [];
    var visitadas = {};

    for (var ri = 0; ri < restantes.length; ri++) {
      var palavra = restantes[ri];
      var palavraChave = palavra.w + '|' + palavra.q;

      for (var ci = 0; ci < colocadas.length; ci++) {
        var pc = colocadas[ci];

        for (var li = 0; li < palavra.w.length; li++) {
          var letra = palavra.w[li];

          for (var pj = 0; pj < pc.w.length; pj++) {
            if (pc.w[pj] !== letra) continue;

            var r, c, d;
            if (pc.d === 'H') {
              r = pc.r - li;
              c = pc.c + pj;
              d = 'V';
            } else {
              r = pc.r + pj;
              c = pc.c - li;
              d = 'H';
            }

            var chavePos = palavraChave + '|' + r + ',' + c + ',' + d;
            if (visitadas[chavePos]) continue;
            visitadas[chavePos] = true;

            if (this.podeColocar(grid, palavra.w, r, c, d)) {
              possibilidades.push({
                palavra: palavra,
                r: r,
                c: c,
                d: d,
                chave: palavraChave
              });
            }
          }
        }
      }
    }

    if (possibilidades.length === 0) return colocadas.length >= 2;

    // Agrupar por palavra; heuristic: palavras com menos opcoes primeiro
    var porPalavra = {};
    for (var pi = 0; pi < possibilidades.length; pi++) {
      var pos = possibilidades[pi];
      if (!porPalavra[pos.chave]) porPalavra[pos.chave] = [];
      porPalavra[pos.chave].push(pos);
    }

    var chaves = Object.keys(porPalavra);
    chaves.sort(function (a, b) {
      return porPalavra[a].length - porPalavra[b].length;
    });

    var melhoresOpcoes = porPalavra[chaves[0]];

    for (var op = 0; op < melhoresOpcoes.length; op++) {
      var escolha = melhoresOpcoes[op];

      // Aplicar palavra no grid
      this.aplicarPalavra(grid, refs, escolha.palavra.w, escolha.r, escolha.c, escolha.d);
      colocadas.push({
        w: escolha.palavra.w,
        q: escolha.palavra.q,
        r: escolha.r,
        c: escolha.c,
        d: escolha.d
      });

      var novasRestantes = [];
      for (var nr = 0; nr < restantes.length; nr++) {
        if (restantes[nr].w !== escolha.palavra.w) {
          novasRestantes.push(restantes[nr]);
        }
      }

      if (this.backtrack(grid, refs, colocadas, novasRestantes, alvo)) {
        return true;
      }

      // Desfazer (backtrack)
      this.removerPalavra(grid, refs, escolha.palavra.w, escolha.r, escolha.c, escolha.d);
      colocadas.pop();
    }

    return false;
  },

  aplicarPalavra(grid, refs, palavra, r, c, d) {
    for (var i = 0; i < palavra.length; i++) {
      var rr = d === 'H' ? r : r + i;
      var cc = d === 'H' ? c + i : c;
      grid[rr][cc] = palavra[i];
      var ch = rr + ',' + cc;
      refs[ch] = (refs[ch] || 0) + 1;
    }
  },

  removerPalavra(grid, refs, palavra, r, c, d) {
    for (var i = 0; i < palavra.length; i++) {
      var rr = d === 'H' ? r : r + i;
      var cc = d === 'H' ? c + i : c;
      var ch = rr + ',' + cc;
      refs[ch] = (refs[ch] || 1) - 1;
      if (refs[ch] <= 0) {
        grid[rr][cc] = '.';
        delete refs[ch];
      }
    }
  },

  /**
   * Verifica se uma palavra pode ser colocada na posicao (r, c) com direccao d.
   * Regras:
   * - Nao pode sair dos limites da grelha
   * - Cada letra coincide ou a celula esta vazia
   * - Celulas vizinhas perpendiculares devem estar vazias (evitar palavras paralelas adjacentes)
   * - Nao pode haver continuacao da palavra antes do inicio nem depois do fim
   */
  podeColocar(grid, palavra, r, c, d) {
    var tam = this.TAMANHO_GRADE;
    if (r < 0 || c < 0) return false;
    if (d === 'H' && c + palavra.length > tam) return false;
    if (d === 'V' && r + palavra.length > tam) return false;

    for (var i = 0; i < palavra.length; i++) {
      var rAtual = d === 'H' ? r : r + i;
      var cAtual = d === 'H' ? c + i : c;

      // Fora dos limites
      if (rAtual < 0 || rAtual >= tam || cAtual < 0 || cAtual >= tam) return false;

      var celula = grid[rAtual][cAtual];

      // Se a celula tem letra diferente, rejeitar
      if (celula !== '.' && celula !== palavra[i]) return false;

      // Celulas perpendiculares adjacentes devem estar vazias (excepto em intersecoes)
      if (celula === '.') {
        // Celula acima / esquerda
        var rPerp1 = d === 'H' ? rAtual - 1 : rAtual;
        var cPerp1 = d === 'H' ? cAtual : cAtual - 1;
        if (rPerp1 >= 0 && rPerp1 < tam && cPerp1 >= 0 && cPerp1 < tam && grid[rPerp1][cPerp1] !== '.') return false;

        // Celula abaixo / direita
        var rPerp2 = d === 'H' ? rAtual + 1 : rAtual;
        var cPerp2 = d === 'H' ? cAtual : cAtual + 1;
        if (rPerp2 >= 0 && rPerp2 < tam && cPerp2 >= 0 && cPerp2 < tam && grid[rPerp2][cPerp2] !== '.') return false;
      }

      // Verificar que nao ha continuacao antes do inicio
      if (i === 0) {
        var rAnt = d === 'H' ? rAtual : rAtual - 1;
        var cAnt = d === 'H' ? cAtual - 1 : cAtual;
        if (rAnt >= 0 && rAnt < tam && cAnt >= 0 && cAnt < tam && grid[rAnt][cAnt] !== '.') return false;
      }

      // Verificar que nao ha continuacao depois do fim
      if (i === palavra.length - 1) {
        var rPos = d === 'H' ? rAtual : rAtual + 1;
        var cPos = d === 'H' ? cAtual + 1 : cAtual;
        if (rPos >= 0 && rPos < tam && cPos >= 0 && cPos < tam && grid[rPos][cPos] !== '.') return false;
      }
    }
    return true;
  },

  /**
   * Recorta a grelha 40x40 para o menor rectangulo que contem todas as palavras.
   * Ajusta as coordenadas das palavras para o novo sistema.
   */
  recortarGrelha(grelhaTemp, palavras) {
    var minR = this.TAMANHO_GRADE, maxR = 0;
    var minC = this.TAMANHO_GRADE, maxC = 0;

    for (var r = 0; r < this.TAMANHO_GRADE; r++) {
      for (var c = 0; c < this.TAMANHO_GRADE; c++) {
        if (grelhaTemp[r][c] !== '.') {
          minR = Math.min(minR, r);
          maxR = Math.max(maxR, r);
          minC = Math.min(minC, c);
          maxC = Math.max(maxC, c);
        }
      }
    }

    var palavrasAjustadas = [];
    for (var i = 0; i < palavras.length; i++) {
      var p = palavras[i];
      palavrasAjustadas.push({
        w: p.w,
        q: p.q,
        r: p.r - minR,
        c: p.c - minC,
        d: p.d
      });
    }

    var linhas = [];
    for (var linR = minR; linR <= maxR; linR++) {
      linhas.push(grelhaTemp[linR].slice(minC, maxC + 1).join(''));
    }

    return {
      nrows: maxR - minR + 1,
      size: maxC - minC + 1,
      rows: linhas,
      words: palavrasAjustadas
    };
  },

  embaralhar(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
  }
};
