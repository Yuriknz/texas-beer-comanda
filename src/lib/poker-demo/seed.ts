import type { Lancamento, PokerState } from "./types";

// Dados de demonstração — nomes, produtos e valores são fictícios.
export function criarSeed(): PokerState {
  const agora = Date.now();
  const haMin = (minutos: number) => new Date(agora - minutos * 60_000).toISOString();
  const emDias = (dias: number) => new Date(agora + dias * 86_400_000).toISOString();

  let seq = 0;
  const lanc = (
    tipo: Lancamento["tipo"],
    descricao: string,
    quantidade: number,
    valorUnitario: number,
    minutos: number
  ): Lancamento => ({
    id: `seed-l${++seq}`,
    tipo,
    descricao,
    quantidade,
    valorUnitario,
    em: haMin(minutos),
  });

  return {
    operador: "WAGNER",
    senha: "1234",
    jogadores: [
      { id: "j1", nome: "Carlos Mendes", apelido: "Carlão", telefone: "(11) 98888-1010", cpf: "", criadoEm: haMin(60 * 24 * 90) },
      { id: "j2", nome: "Rafael Souza", apelido: "Rafa", telefone: "(11) 97777-2020", cpf: "", criadoEm: haMin(60 * 24 * 80) },
      { id: "j3", nome: "Juliana Prado", apelido: "Ju", telefone: "(11) 96666-3030", cpf: "", criadoEm: haMin(60 * 24 * 61) },
      { id: "j4", nome: "Marcos Tavares", apelido: "Marcão", telefone: "(11) 95555-4040", cpf: "", criadoEm: haMin(60 * 24 * 45) },
      { id: "j5", nome: "Diego Albuquerque", apelido: "Dieguinho", telefone: "(11) 94444-5050", cpf: "", criadoEm: haMin(60 * 24 * 30) },
      { id: "j6", nome: "Patrícia Lima", apelido: "Paty", telefone: "(11) 93333-6060", cpf: "", criadoEm: haMin(60 * 24 * 21) },
      { id: "j7", nome: "Henrique Castro", apelido: "Kiko", telefone: "(11) 92222-7070", cpf: "", criadoEm: haMin(60 * 24 * 14) },
      { id: "j8", nome: "Bruno Ferraz", apelido: "Bruninho", telefone: "(11) 91111-8080", cpf: "", criadoEm: haMin(60 * 24 * 3) },
    ],
    produtos: [
      { id: "p1", nome: "Chopp Pilsen 300ml", categoria: "Chopp", preco: 9, disponivel: true },
      { id: "p2", nome: "Chopp Pilsen 500ml", categoria: "Chopp", preco: 14, disponivel: true },
      { id: "p3", nome: "Chopp IPA 500ml", categoria: "Chopp", preco: 19, disponivel: true },
      { id: "p4", nome: "Long Neck", categoria: "Cervejas", preco: 12, disponivel: true },
      { id: "p5", nome: "Água mineral", categoria: "Sem álcool", preco: 5, disponivel: true },
      { id: "p6", nome: "Refrigerante lata", categoria: "Sem álcool", preco: 7, disponivel: true },
      { id: "p7", nome: "Energético", categoria: "Sem álcool", preco: 16, disponivel: true },
      { id: "p8", nome: "Porção de fritas", categoria: "Porções", preco: 32, disponivel: true },
      { id: "p9", nome: "Tábua de frios", categoria: "Porções", preco: 58, disponivel: true },
      { id: "p10", nome: "Espetinho de carne", categoria: "Churrasqueira", preco: 12, disponivel: true },
      { id: "p11", nome: "Dose de whisky", categoria: "Destilados", preco: 28, disponivel: false },
    ],
    contas: [
      {
        id: "c1",
        numero: 101,
        jogadorId: "j1",
        status: "aberta",
        abertaEm: haMin(140),
        lancamentos: [
          lanc("torneio", "Buy-in — Torneio de Terça", 1, 80, 138),
          lanc("produto", "Chopp Pilsen 500ml", 2, 14, 95),
          lanc("torneio", "Rebuy — Torneio de Terça", 1, 80, 60),
          lanc("produto", "Porção de fritas", 1, 32, 40),
        ],
      },
      {
        id: "c2",
        numero: 102,
        jogadorId: "j3",
        status: "aberta",
        abertaEm: haMin(120),
        lancamentos: [
          lanc("cacife", "Cacife (fichas)", 1, 200, 118),
          lanc("produto", "Chopp IPA 500ml", 1, 19, 80),
          lanc("cacife", "Cacife (fichas)", 1, 100, 35),
        ],
      },
      {
        id: "c3",
        numero: 103,
        jogadorId: "j4",
        status: "aberta",
        abertaEm: haMin(110),
        lancamentos: [
          lanc("torneio", "Buy-in — Torneio de Terça", 1, 80, 108),
          lanc("produto", "Long Neck", 3, 12, 70),
          lanc("produto", "Espetinho de carne", 2, 12, 25),
        ],
      },
      {
        id: "c4",
        numero: 104,
        jogadorId: "j2",
        status: "aberta",
        abertaEm: haMin(105),
        lancamentos: [
          lanc("torneio", "Buy-in — Torneio de Terça", 1, 80, 104),
          lanc("produto", "Energético", 1, 16, 50),
        ],
      },
      {
        id: "c5",
        numero: 100,
        jogadorId: "j6",
        status: "fechada",
        abertaEm: haMin(170),
        fechadaEm: haMin(20),
        formaPagamento: "pix",
        notaId: "n1",
        lancamentos: [
          lanc("torneio", "Buy-in — Torneio de Terça", 1, 80, 168),
          lanc("produto", "Chopp Pilsen 300ml", 2, 9, 120),
          lanc("produto", "Água mineral", 1, 5, 60),
        ],
      },
    ],
    caixa: {
      status: "aberto",
      operador: "WAGNER",
      abertoEm: haMin(180),
      movimentos: [
        { id: "m1", tipo: "abertura", descricao: "Fundo de troco", valor: 500, forma: "dinheiro", em: haMin(180) },
        { id: "m2", tipo: "recebimento", descricao: "Conta #100 — Patrícia Lima", valor: 103, forma: "pix", em: haMin(20), contaId: "c5" },
      ],
    },
    torneios: [
      {
        id: "t1",
        nome: "Torneio de Terça",
        data: haMin(150),
        buyIn: 80,
        rebuyValor: 80,
        addonValor: 50,
        fichasIniciais: 10000,
        taxaCasaPercentual: 15,
        status: "em_andamento",
        inscricoes: [
          { jogadorId: "j1", rebuys: 1, addon: false, status: "ativo" },
          { jogadorId: "j2", rebuys: 0, addon: false, status: "ativo" },
          { jogadorId: "j4", rebuys: 0, addon: false, status: "ativo" },
          { jogadorId: "j6", rebuys: 0, addon: false, status: "eliminado", posicao: 4 },
        ],
        premiacao: [50, 30, 20],
      },
      {
        id: "t2",
        nome: "Sexta Deep Stack",
        data: emDias(3),
        buyIn: 150,
        rebuyValor: 150,
        addonValor: 100,
        fichasIniciais: 20000,
        taxaCasaPercentual: 15,
        status: "inscricoes",
        inscricoes: [],
        premiacao: [50, 30, 20],
      },
    ],
    notas: [
      {
        id: "n1",
        numero: 1042,
        contaId: "c5",
        jogadorNome: "Patrícia Lima",
        cpf: "",
        valor: 23,
        status: "autorizada",
        emitidaEm: haMin(20),
      },
    ],
  };
}
