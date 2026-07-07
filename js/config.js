var CruzadasApp = window.CruzadasApp || {};

CruzadasApp.CX_TEMAS = [
  { id: 'geral',     nome: 'Cultura Geral',      icone: '\uD83C\uDF0D', cor: 'linear-gradient(155deg, #4A6FA5, #35507C)' },
  { id: 'natureza',  nome: 'Natureza e Ci\u00EAncia', icone: '\uD83C\uDF3F', cor: 'linear-gradient(155deg, #4C6B4F, #3A523C)' },
  { id: 'portugal',  nome: 'Portugal',            icone: '\uD83C\uDDF5\uD83C\uDDF9', cor: 'linear-gradient(155deg, #B5503F, #8F3A2A)' },
  { id: 'saude',     nome: 'Sa\u00FAde e Corpo',     icone: '\uD83E\uDD7A', cor: 'linear-gradient(155deg, #C2702C, #9A551E)' },
  { id: 'artes',     nome: 'Artes e Letras',      icone: '\uD83C\uDFAD', cor: 'linear-gradient(155deg, #7A5C8F, #5C4368)' },
  { id: 'viagens',   nome: 'Viagens e Lugares',   icone: '\u2708\uFE0F', cor: 'linear-gradient(155deg, #9A8A5C, #756842)' }
];

CruzadasApp.CHAVE_ESTADO = 'mv2_cruzadas_pwa_estado';
CruzadasApp.CHAVE_ESTATISTICAS = 'mv2_cruzadas_pwa_estatisticas';

CruzadasApp.RE_IMPLANTE = /^(IPX |IPXC |ICI |ICIC )/;
CruzadasApp.RE_PILAR    = /^(MUSR |MUSLAR |MUSA |MUSLA |MUST |MUSTE |EMU |PA |PR |PGZA |PCERC |PEA |PCS |PCCS |PCIR |PCIA |PKO |PKB |PCERCM|KMUST |KMU |KEMU |MU )/;
