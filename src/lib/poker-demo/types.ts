// Tipos do protótipo do módulo de poker (WB Poker). Nesta fase os dados vivem
// só no navegador (localStorage) — ver store.tsx. Valores monetários em reais.

export type FormaPagamento = "dinheiro" | "pix" | "cartao";

export type Jogador = {
  id: string;
  nome: string;
  apelido: string;
  telefone: string;
  cpf: string;
  /** PIN de 4 dígitos que o próprio jogador digita para autorizar débitos de jogo; "" = ainda não criou */
  pin: string;
  /** erros seguidos de PIN; com 3 o PIN bloqueia e só o gerente libera */
  pinErros: number;
  criadoEm: string;
};

export const PIN_MAX_ERROS = 3;

/** Quem autoriza um débito de jogo: o jogador (PIN, ou criando o PIN no primeiro uso) ou o gerente. */
export type Credencial = { pin: string } | { novoPin: string } | { senhaGerente: string };

export type Produto = {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  disponivel: boolean;
};

// Débitos (produto, cacife, torneio) têm valor positivo; créditos ao jogador
// (devolucao de fichas, premio de torneio) têm valor negativo.
export type LancamentoTipo = "produto" | "cacife" | "devolucao" | "torneio" | "premio";

export type Lancamento = {
  id: string;
  tipo: LancamentoTipo;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  em: string;
  /** trilha de auditoria dos débitos de jogo */
  autorizadoPor?: "pin" | "gerente";
  operador?: string;
};

export type Conta = {
  id: string;
  numero: number;
  jogadorId: string;
  status: "aberta" | "fechada";
  abertaEm: string;
  fechadaEm?: string;
  lancamentos: Lancamento[];
  formaPagamento?: FormaPagamento;
  notaId?: string;
};

export type MovimentoTipo = "abertura" | "suprimento" | "sangria" | "recebimento" | "pagamento";

export type MovimentoCaixa = {
  id: string;
  tipo: MovimentoTipo;
  descricao: string;
  // sempre positivo; o sinal vem do tipo (sangria e pagamento são saídas)
  valor: number;
  forma: FormaPagamento;
  em: string;
  contaId?: string;
};

export type Caixa = {
  status: "aberto" | "fechado";
  operador: string;
  abertoEm?: string;
  fechadoEm?: string;
  movimentos: MovimentoCaixa[];
};

export type Inscricao = {
  jogadorId: string;
  rebuys: number;
  addon: boolean;
  status: "ativo" | "eliminado";
  posicao?: number;
};

export type Torneio = {
  id: string;
  nome: string;
  data: string;
  buyIn: number;
  rebuyValor: number;
  addonValor: number;
  fichasIniciais: number;
  taxaCasaPercentual: number;
  status: "inscricoes" | "em_andamento" | "encerrado";
  inscricoes: Inscricao[];
  // percentuais do prêmio líquido por colocação (índice 0 = campeão)
  premiacao: number[];
  /** premiação sugerida pelo nº de inscritos; `premiacao` só passa a valer no encerramento */
  premiacaoAutomatica?: boolean;
};

export type NotaFiscal = {
  id: string;
  numero: number;
  contaId: string;
  jogadorNome: string;
  cpf: string;
  valor: number;
  status: "autorizada" | "cancelada";
  emitidaEm: string;
};

export type PokerState = {
  operador: string;
  senha: string;
  senhaGerente: string;
  jogadores: Jogador[];
  produtos: Produto[];
  contas: Conta[];
  caixa: Caixa;
  torneios: Torneio[];
  notas: NotaFiscal[];
};

export type Resultado<T = unknown> =
  | ({ ok: true } & T)
  // persistir: a ação falhou mas deixou algo a gravar (contagem de erros de PIN)
  | { ok: false; error: string; persistir?: boolean };
