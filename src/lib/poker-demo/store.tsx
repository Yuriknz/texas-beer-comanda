"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { resumoTorneio, totalConsumo, totalConta } from "./calc";
import { criarSeed } from "./seed";
import type {
  Conta,
  FormaPagamento,
  Jogador,
  Lancamento,
  MovimentoCaixa,
  PokerState,
  Produto,
  Resultado,
  Torneio,
} from "./types";

// Protótipo: o estado inteiro fica no localStorage do aparelho. Todas as regras
// de negócio estão concentradas aqui para que a troca por Supabase (server
// actions) depois não exija mexer nas telas.
const STORAGE_KEY = "wb-poker-demo-v1";

const novoId = () => crypto.randomUUID();
const agora = () => new Date().toISOString();
const erro = (error: string) => ({ ok: false as const, error });
const OK = { ok: true as const };

type DadosJogador = Pick<Jogador, "nome" | "apelido" | "telefone" | "cpf">;
type DadosProduto = Pick<Produto, "nome" | "categoria" | "preco" | "disponivel">;
type DadosTorneio = Pick<
  Torneio,
  "nome" | "data" | "buyIn" | "rebuyValor" | "addonValor" | "fichasIniciais" | "taxaCasaPercentual" | "premiacao"
>;

function nomeJogador(state: PokerState, jogadorId: string): string {
  return state.jogadores.find((j) => j.id === jogadorId)?.nome ?? "Jogador";
}

/** Devolve a conta aberta do jogador, abrindo uma nova se ele não tiver. */
function contaDoJogador(state: PokerState, jogadorId: string): Conta {
  const aberta = state.contas.find((c) => c.jogadorId === jogadorId && c.status === "aberta");
  if (aberta) return aberta;
  const conta: Conta = {
    id: novoId(),
    numero: Math.max(100, ...state.contas.map((c) => c.numero)) + 1,
    jogadorId,
    status: "aberta",
    abertaEm: agora(),
    lancamentos: [],
  };
  state.contas.push(conta);
  return conta;
}

function lancar(
  conta: Conta,
  tipo: Lancamento["tipo"],
  descricao: string,
  quantidade: number,
  valorUnitario: number
) {
  conta.lancamentos.push({ id: novoId(), tipo, descricao, quantidade, valorUnitario, em: agora() });
}

function movimentar(state: PokerState, movimento: Omit<MovimentoCaixa, "id" | "em">) {
  state.caixa.movimentos.push({ ...movimento, id: novoId(), em: agora() });
}

function emitirNotaDaConta(state: PokerState, conta: Conta): boolean {
  const valor = totalConsumo(conta);
  if (valor <= 0 || conta.notaId) return false;
  const jogador = state.jogadores.find((j) => j.id === conta.jogadorId);
  const nota = {
    id: novoId(),
    numero: Math.max(1000, ...state.notas.map((n) => n.numero)) + 1,
    contaId: conta.id,
    jogadorNome: jogador?.nome ?? "Consumidor",
    cpf: jogador?.cpf ?? "",
    valor,
    status: "autorizada" as const,
    emitidaEm: agora(),
  };
  state.notas.push(nota);
  conta.notaId = nota.id;
  return true;
}

function criarAcoes(mutar: <T>(fn: (state: PokerState) => Resultado<T>) => Resultado<T>, reset: () => void) {
  return {
    // --- Jogadores ---
    criarJogador: (dados: DadosJogador) =>
      mutar<{ id: string }>((s) => {
        if (!dados.nome.trim()) return erro("Informe o nome do jogador.");
        const id = novoId();
        s.jogadores.push({ ...dados, nome: dados.nome.trim(), id, criadoEm: agora() });
        return { ok: true, id };
      }),
    atualizarJogador: (id: string, dados: DadosJogador) =>
      mutar((s) => {
        const jogador = s.jogadores.find((j) => j.id === id);
        if (!jogador) return erro("Jogador não encontrado.");
        if (!dados.nome.trim()) return erro("Informe o nome do jogador.");
        Object.assign(jogador, dados, { nome: dados.nome.trim() });
        return OK;
      }),

    // --- Produtos ---
    criarProduto: (dados: DadosProduto) =>
      mutar((s) => {
        if (!dados.nome.trim()) return erro("Informe o nome do produto.");
        if (!(dados.preco >= 0)) return erro("Preço inválido.");
        s.produtos.push({ ...dados, id: novoId() });
        return OK;
      }),
    atualizarProduto: (id: string, dados: Partial<DadosProduto>) =>
      mutar((s) => {
        const produto = s.produtos.find((p) => p.id === id);
        if (!produto) return erro("Produto não encontrado.");
        Object.assign(produto, dados);
        return OK;
      }),

    // --- Contas ---
    abrirConta: (jogadorId: string) =>
      mutar<{ contaId: string }>((s) => {
        if (!s.jogadores.some((j) => j.id === jogadorId)) return erro("Jogador não encontrado.");
        return { ok: true, contaId: contaDoJogador(s, jogadorId).id };
      }),
    lancarProduto: (contaId: string, produtoId: string, quantidade: number) =>
      mutar((s) => {
        const conta = s.contas.find((c) => c.id === contaId && c.status === "aberta");
        const produto = s.produtos.find((p) => p.id === produtoId);
        if (!conta) return erro("Conta não está aberta.");
        if (!produto || !produto.disponivel) return erro("Produto indisponível.");
        if (quantidade < 1) return erro("Quantidade inválida.");
        // repetir o mesmo produto soma na linha existente em vez de poluir a conta
        const existente = conta.lancamentos.find(
          (l) => l.tipo === "produto" && l.descricao === produto.nome && l.valorUnitario === produto.preco
        );
        if (existente) {
          existente.quantidade += quantidade;
          existente.em = agora();
        } else {
          lancar(conta, "produto", produto.nome, quantidade, produto.preco);
        }
        return OK;
      }),
    /** Compra de fichas de cash game: vai para a conta do jogador. */
    lancarCacife: (jogadorId: string, valor: number) =>
      mutar<{ contaId: string }>((s) => {
        if (!s.jogadores.some((j) => j.id === jogadorId)) return erro("Jogador não encontrado.");
        if (!(valor > 0)) return erro("Informe o valor do cacife.");
        const conta = contaDoJogador(s, jogadorId);
        lancar(conta, "cacife", "Cacife (fichas)", 1, valor);
        return { ok: true, contaId: conta.id };
      }),
    /** Jogador devolve fichas ao sair do cash game: crédito na conta. */
    lancarDevolucao: (jogadorId: string, valor: number) =>
      mutar<{ contaId: string }>((s) => {
        if (!s.jogadores.some((j) => j.id === jogadorId)) return erro("Jogador não encontrado.");
        if (!(valor > 0)) return erro("Informe o valor devolvido.");
        const conta = contaDoJogador(s, jogadorId);
        lancar(conta, "devolucao", "Devolução de fichas", 1, -valor);
        return { ok: true, contaId: conta.id };
      }),
    removerLancamento: (contaId: string, lancamentoId: string) =>
      mutar((s) => {
        const conta = s.contas.find((c) => c.id === contaId && c.status === "aberta");
        if (!conta) return erro("Conta não está aberta.");
        const lancamento = conta.lancamentos.find((l) => l.id === lancamentoId);
        if (!lancamento) return erro("Lançamento não encontrado.");
        // inscrição, rebuy e prêmio são controlados pela tela do torneio
        if (lancamento.tipo === "torneio" || lancamento.tipo === "premio") {
          return erro("Lançamentos de torneio não podem ser removidos pela conta.");
        }
        conta.lancamentos = conta.lancamentos.filter((l) => l.id !== lancamentoId);
        return OK;
      }),
    fecharConta: (contaId: string, forma: FormaPagamento, emitirNota: boolean) =>
      mutar<{ total: number; notaEmitida: boolean }>((s) => {
        const conta = s.contas.find((c) => c.id === contaId && c.status === "aberta");
        if (!conta) return erro("Conta não está aberta.");
        if (s.caixa.status !== "aberto") return erro("Abra o caixa antes de fechar contas.");
        const jogandoEm = s.torneios.find(
          (t) =>
            t.status === "em_andamento" &&
            t.inscricoes.some((i) => i.jogadorId === conta.jogadorId && i.status === "ativo")
        );
        if (jogandoEm) return erro(`Jogador ainda está ativo no torneio "${jogandoEm.nome}".`);
        const total = totalConta(conta);
        const descricao = `Conta #${conta.numero} — ${nomeJogador(s, conta.jogadorId)}`;
        if (total > 0) {
          movimentar(s, { tipo: "recebimento", descricao, valor: total, forma, contaId });
        } else if (total < 0) {
          movimentar(s, { tipo: "pagamento", descricao, valor: -total, forma, contaId });
        }
        conta.status = "fechada";
        conta.fechadaEm = agora();
        conta.formaPagamento = forma;
        const notaEmitida = emitirNota ? emitirNotaDaConta(s, conta) : false;
        return { ok: true, total, notaEmitida };
      }),

    // --- Caixa ---
    abrirCaixa: (fundoInicial: number) =>
      mutar((s) => {
        if (s.caixa.status === "aberto") return erro("O caixa já está aberto.");
        if (!(fundoInicial >= 0)) return erro("Fundo inicial inválido.");
        s.caixa = { status: "aberto", operador: s.operador, abertoEm: agora(), movimentos: [] };
        movimentar(s, { tipo: "abertura", descricao: "Fundo de troco", valor: fundoInicial, forma: "dinheiro" });
        return OK;
      }),
    fecharCaixa: () =>
      mutar((s) => {
        if (s.caixa.status !== "aberto") return erro("O caixa já está fechado.");
        const abertas = s.contas.filter((c) => c.status === "aberta").length;
        if (abertas > 0) return erro(`Ainda há ${abertas} conta(s) aberta(s).`);
        s.caixa.status = "fechado";
        s.caixa.fechadoEm = agora();
        return OK;
      }),
    registrarSuprimento: (valor: number, descricao: string) =>
      mutar((s) => {
        if (s.caixa.status !== "aberto") return erro("O caixa está fechado.");
        if (!(valor > 0)) return erro("Informe o valor.");
        movimentar(s, { tipo: "suprimento", descricao: descricao.trim() || "Suprimento", valor, forma: "dinheiro" });
        return OK;
      }),
    registrarSangria: (valor: number, descricao: string) =>
      mutar((s) => {
        if (s.caixa.status !== "aberto") return erro("O caixa está fechado.");
        if (!(valor > 0)) return erro("Informe o valor.");
        movimentar(s, { tipo: "sangria", descricao: descricao.trim() || "Sangria", valor, forma: "dinheiro" });
        return OK;
      }),

    // --- Torneios ---
    criarTorneio: (dados: DadosTorneio) =>
      mutar<{ id: string }>((s) => {
        if (!dados.nome.trim()) return erro("Informe o nome do torneio.");
        if (!(dados.buyIn > 0)) return erro("Informe o buy-in.");
        const somaPremiacao = dados.premiacao.reduce((a, b) => a + b, 0);
        if (somaPremiacao !== 100) return erro("A premiação precisa somar 100%.");
        const id = novoId();
        s.torneios.push({ ...dados, nome: dados.nome.trim(), id, status: "inscricoes", inscricoes: [] });
        return { ok: true, id };
      }),
    inscreverJogador: (torneioId: string, jogadorId: string) =>
      mutar((s) => {
        const torneio = s.torneios.find((t) => t.id === torneioId);
        if (!torneio || torneio.status === "encerrado") return erro("Torneio não aceita inscrições.");
        if (torneio.inscricoes.some((i) => i.jogadorId === jogadorId)) return erro("Jogador já inscrito.");
        if (!s.jogadores.some((j) => j.id === jogadorId)) return erro("Jogador não encontrado.");
        // inscrição tardia aumenta o campo: quem já caiu desce uma colocação
        torneio.inscricoes.forEach((i) => {
          if (i.posicao) i.posicao += 1;
        });
        torneio.inscricoes.push({ jogadorId, rebuys: 0, addon: false, status: "ativo" });
        lancar(contaDoJogador(s, jogadorId), "torneio", `Buy-in — ${torneio.nome}`, 1, torneio.buyIn);
        return OK;
      }),
    registrarRebuy: (torneioId: string, jogadorId: string) =>
      mutar((s) => {
        const torneio = s.torneios.find((t) => t.id === torneioId);
        const inscricao = torneio?.inscricoes.find((i) => i.jogadorId === jogadorId);
        if (!torneio || torneio.status !== "em_andamento" || !inscricao) return erro("Rebuy indisponível.");
        if (inscricao.addon) return erro("Depois do add-on não há mais rebuy.");
        inscricao.rebuys += 1;
        // rebuy recoloca na mesa um jogador que tinha sido eliminado; quem caiu
        // depois dele desce uma colocação para as posições não se repetirem
        const posicaoAnterior = inscricao.posicao;
        if (posicaoAnterior) {
          torneio.inscricoes.forEach((i) => {
            if (i.posicao && i.posicao < posicaoAnterior) i.posicao += 1;
          });
        }
        inscricao.status = "ativo";
        inscricao.posicao = undefined;
        lancar(contaDoJogador(s, jogadorId), "torneio", `Rebuy — ${torneio.nome}`, 1, torneio.rebuyValor);
        return OK;
      }),
    registrarAddon: (torneioId: string, jogadorId: string) =>
      mutar((s) => {
        const torneio = s.torneios.find((t) => t.id === torneioId);
        const inscricao = torneio?.inscricoes.find((i) => i.jogadorId === jogadorId);
        if (!torneio || torneio.status !== "em_andamento" || !inscricao) return erro("Add-on indisponível.");
        if (inscricao.status !== "ativo") return erro("Jogador já foi eliminado.");
        if (inscricao.addon) return erro("Jogador já fez o add-on.");
        inscricao.addon = true;
        lancar(contaDoJogador(s, jogadorId), "torneio", `Add-on — ${torneio.nome}`, 1, torneio.addonValor);
        return OK;
      }),
    iniciarTorneio: (torneioId: string) =>
      mutar((s) => {
        const torneio = s.torneios.find((t) => t.id === torneioId);
        if (!torneio || torneio.status !== "inscricoes") return erro("Torneio não pode ser iniciado.");
        if (torneio.inscricoes.length < 2) return erro("São necessários pelo menos 2 inscritos.");
        torneio.status = "em_andamento";
        return OK;
      }),
    eliminarJogador: (torneioId: string, jogadorId: string) =>
      mutar((s) => {
        const torneio = s.torneios.find((t) => t.id === torneioId);
        const inscricao = torneio?.inscricoes.find((i) => i.jogadorId === jogadorId);
        if (!torneio || torneio.status !== "em_andamento" || !inscricao) return erro("Eliminação indisponível.");
        if (inscricao.status !== "ativo") return erro("Jogador já foi eliminado.");
        const ativos = torneio.inscricoes.filter((i) => i.status === "ativo").length;
        if (ativos <= 1) return erro("Resta só o campeão — encerre o torneio.");
        inscricao.status = "eliminado";
        inscricao.posicao = ativos;
        return OK;
      }),
    /** Define o campeão e credita os prêmios nas contas dos jogadores premiados. */
    encerrarTorneio: (torneioId: string) =>
      mutar((s) => {
        const torneio = s.torneios.find((t) => t.id === torneioId);
        if (!torneio || torneio.status !== "em_andamento") return erro("Torneio não está em andamento.");
        const ativos = torneio.inscricoes.filter((i) => i.status === "ativo");
        if (ativos.length !== 1) return erro("Elimine os jogadores até restar só o campeão.");
        ativos[0].posicao = 1;
        const { premios } = resumoTorneio(torneio);
        premios.forEach((premio, indice) => {
          const premiado = torneio.inscricoes.find((i) => i.posicao === indice + 1);
          if (!premiado || premio <= 0) return;
          lancar(
            contaDoJogador(s, premiado.jogadorId),
            "premio",
            `Prêmio ${indice + 1}º lugar — ${torneio.nome}`,
            1,
            -premio
          );
        });
        torneio.status = "encerrado";
        return OK;
      }),

    // --- Nota fiscal ---
    emitirNota: (contaId: string) =>
      mutar((s) => {
        const conta = s.contas.find((c) => c.id === contaId);
        if (!conta || conta.status !== "fechada") return erro("Só contas fechadas emitem nota.");
        if (conta.notaId) return erro("Esta conta já tem nota emitida.");
        if (!emitirNotaDaConta(s, conta)) return erro("Conta sem consumo de bar para faturar.");
        return OK;
      }),
    cancelarNota: (notaId: string) =>
      mutar((s) => {
        const nota = s.notas.find((n) => n.id === notaId);
        if (!nota || nota.status !== "autorizada") return erro("Nota não pode ser cancelada.");
        nota.status = "cancelada";
        const conta = s.contas.find((c) => c.id === nota.contaId);
        if (conta) conta.notaId = undefined;
        return OK;
      }),

    // --- Senha ---
    alterarSenha: (atual: string, nova: string) =>
      mutar((s) => {
        if (atual !== s.senha) return erro("Senha atual incorreta.");
        if (nova.length < 4) return erro("A nova senha precisa de pelo menos 4 caracteres.");
        s.senha = nova;
        return OK;
      }),

    /** Volta aos dados de demonstração originais. */
    resetarDemo: reset,
  };
}

export type PokerActions = ReturnType<typeof criarAcoes>;

// Store externo ao React (useSyncExternalStore): as actions precisam ler o
// estado mais recente de forma síncrona para devolver o resultado na hora.
let estadoAtual: PokerState | null = null;
const ouvintes = new Set<() => void>();

function gravar(next: PokerState) {
  estadoAtual = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // modo privado / armazenamento cheio: segue só em memória
  }
  ouvintes.forEach((ouvinte) => ouvinte());
}

function carregar() {
  if (estadoAtual) return;
  let salvo: PokerState | null = null;
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    if (bruto) salvo = JSON.parse(bruto) as PokerState;
  } catch {
    salvo = null;
  }
  gravar(salvo ?? criarSeed());
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

const acoes = criarAcoes(
  (fn) => {
    const rascunho = structuredClone(estadoAtual!);
    const resultado = fn(rascunho);
    if (resultado.ok) gravar(rascunho);
    return resultado;
  },
  () => gravar(criarSeed())
);

const PokerContext = createContext<{ state: PokerState; actions: PokerActions } | null>(null);

export function PokerDemoProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(
    assinar,
    () => estadoAtual,
    () => null
  );

  // localStorage só existe no cliente, então a carga inicial é pós-mount
  useEffect(carregar, []);

  const valor = useMemo(() => (state ? { state, actions: acoes } : null), [state]);

  if (!valor) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return <PokerContext.Provider value={valor}>{children}</PokerContext.Provider>;
}

export function usePoker() {
  const contexto = useContext(PokerContext);
  if (!contexto) throw new Error("usePoker precisa estar dentro de PokerDemoProvider");
  return contexto;
}