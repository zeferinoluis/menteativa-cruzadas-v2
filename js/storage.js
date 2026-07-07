var CruzadasApp = window.CruzadasApp || {};

CruzadasApp.ARMAZEM = {
  ler(chave) {
    try {
      var s = localStorage.getItem(chave);
      return s ? JSON.parse(s) : null;
    } catch (e) {
      console.warn('ARMAZEM: erro ao ler', chave, e);
      return null;
    }
  },

  guardar(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
      return true;
    } catch (e) {
      console.error('ARMAZEM: erro ao guardar', chave, e);
      return false;
    }
  },

  remover(chave) {
    try {
      localStorage.removeItem(chave);
    } catch (e) {
      console.warn('ARMAZEM: erro ao remover', chave, e);
    }
  },

  limparTudo() {
    try {
      localStorage.removeItem(CruzadasApp.CHAVE_ESTADO);
      localStorage.removeItem(CruzadasApp.CHAVE_ESTATISTICAS);
    } catch (e) {
      console.warn('ARMAZEM: erro ao limpar', e);
    }
  }
};
