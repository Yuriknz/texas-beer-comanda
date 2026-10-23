"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  MAX_PREMIADOS,
  numeroPremiados,
  resumoTorneio,
  totalConsumo,
  totalConta,
  totalLancamento,
} from "./calc";
import { criarSeed } from "./seed";
import { PIN_MAX_ERROS } from "./types";
import type {
  Conta,
  Credencial,
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
const STORAGE_KEY = "wb-poker-demo-v2";

const novoId = () => crypto.randomUUID();
const agora = () => new Date().toISOString();
const erro = (error: string) => ({ ok: false as const, error });
const OK = { ok: true as const };

type DadosJogador = Pick<Jogador, "nome" | "apelido" | "telefone" | "cpf">;
type Autorizacao = NonNullable<Lancamento["autorizadoPor"]>;
const PIN_VALIDO = /^\d{4}$/;
type DadosProduto = Pick<Produto, "nome" | "categoria" | "preco" | "disponivel">;
type DadosTorneio = Pick<
  Torneio,
  "nome" | "data" | "buyIn" | "rebuyValor" | "addonValor" | "fichasIniciais" | "taxaCasaPercentual" | "premiacao" | "premiacaoAutomatica" | "premiados"
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
  valorUnitario: number,
  extras?: Pick<Lancamento, "autorizadoPor" | "operador" | "torneioId">
) {
  conta.lancamentos.push({
    id: novoId(),
    tipo,
    descricao,
    quantidade,
    valorUnitario,
    em: agora(),
    ...extras,
  });
}

/** Buy-in, rebuy e add-on que o jogador pagou neste torneio (os dados de exemplo não têm torneioId). */
function ehDebitoDoTorneio(lancamento: Lancamento, torneio: Torneio): boolean {
  // valor negativo é estorno de uma exclusão anterior, não débito
  if (lancamento.tipo !== "torneio" || lancamento.valorUnitario <= 0) return false;
  if (lancamento.torneioId) return lancamento.torneioId === torneio.id;
  return lancamento.descricao.endsWith(` — ${torneio.nome}`);
}

/**
 * Débito de jogo (buy-in, rebuy, add-on, cacife) só entra com o PIN do próprio
 * jogador ou com a senha de gerente. Deve rodar antes de qualquer alteração da
 * ação: num PIN errado só a contagem de erros é gravada.
 */
function autorizar(
  state: PokerState,
  jogadorId: string,
  credencial: Credencial
):
  | { ok: true; auditoria: { autorizadoPor: Autorizacao; operador: string } }
  | { ok: false; error: string; persistir?: boolean } {
  const jogador = state.jogadores.find((j) => j.id === jogadorId);
  if (!jogador) return erro("Jogador não encontrado.");
  const liberado = (autorizadoPor: Autorizacao) => ({
    ok: true as const,
    auditoria: { autorizadoPor, operador: state.operador },
  });

  if ("senhaGerente" in credencial) {
    if (credencial.senhaGerente !== state.senhaGerente) return erro("Senha de gerente incorreta.");
    return liberado("gerente");
  }
  if ("novoPin" in credencial) {
    if (jogador.pin) return erro("Este jogador já tem PIN.");
    if (!PIN_VALIDO.test(credencial.novoPin)) return erro("O PIN precisa ter 4 dígitos.");
    jogador.pin = credencial.novoPin;
    jogador.pinErros = 0;
    return liberado("pin");
  }
  if (!jogador.pin) return erro("Este jogador ainda não criou o PIN.");
  if (jogador.pinErros >= PIN_MAX_ERROS) return erro("PIN bloqueado. Chame o gerente para liberar.");
  if (credencial.pin !== jogador.pin) {
    jogador.pinErros += 1;
    const restam = PIN_MAX_ERROS - jogador.pinErros;
    return {
      ok: false,
      persistir: true,
      error:
        restam > 0
          ? `PIN incorreto. ${restam === 1 ? "Resta 1 tentativa" : `Restam ${restam} tentativas`}.`
          : "PIN incorreto. PIN bloqueado — chame o gerente para liberar.",
    };
  }
  jogador.pinErros = 0;
  return liberado("pin");
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

function criarAcoes(
  // NoInfer: o tipo extra do sucesso só vale quando a ação o declara (mutar<{ id }>)
  mutar: <T = object>(fn: (state: PokerState) => Resultado<NoInfer<T>>) => Resultado<T>,
  reset: () => void
) {
  return {
    // --- Jogadores ---
    criarJogador: (dados: DadosJogador & { pin?: string }) =>
      mutar<{ id: string }>((s) => {
        if (!dados.nome.trim()) return erro("Informe o nome do jogador.");
        const pin = dados.pin ?? "";
        if (pin && !PIN_VALIDO.test(pin)) return erro("O PIN precisa ter 4 dígitos.");
        const id = novoId();
        s.jogadores.push({ ...dados, nome: dados.nome.trim(), pin, pinErros: 0, id, criadoEm: agora() });
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

    /** Define o PIN. Trocar um PIN que já existe (esquecido ou bloqueado) exige a senha de gerente. */
    redefinirPin: (jogadorId: string, novoPin: string, senhaGerente: string) =>
      mutar((s) => {
        const jogador = s.jogadores.find((j) => j.id === jogadorId);
        if (!jogador) return erro("Jogador não encontrado.");
        if (jogador.pin && senhaGerente !== s.senhaGerente) return erro("Senha de gerente incorreta.");
        if (!PIN_VALIDO.test(novoPin)) return erro("O PIN precisa ter 4 dígitos.");
        jogador.pin = novoPin;
        jogador.pinErros = 0;
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
    lancarCacife: (jogadorId: string, valor: number, credencial: Credencial) =>
      mutar<{ contaId: string }>((s) => {
        if (!s.jogadores.some((j) => j.id === jogadorId)) return erro("Jogador não encontrado.");
        if (!(valor > 0)) return erro("Informe o valor do cacife.");
        const autorizacao = autorizar(s, jogadorId, credencial);
        if (!autorizacao.ok) return autorizacao;
        const conta = contaDoJogador(s, jogadorId);
        lancar(conta, "cacife", "Cacife (fichas)", 1, valor, autorizacao.auditoria);
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
        if (!dados.premiacaoAutomatica && somaPremiacao !== 100) {
          return erro("A premiação precisa somar 100%.");
        }
        if (dados.premiados !== undefined && !(dados.premiados >= 1 && dados.premiados <= MAX_PREMIADOS)) {
          return erro(`Escolha de 1 a ${MAX_PREMIADOS} premiados.`);
        }
        if (!(dados.taxaCasaPercentual >= 0 && dados.taxaCasaPercentual <= 100)) {
          return erro("A taxa da casa deve ficar entre 0 e 100%.");
        }
        const id = novoId();
        s.torneios.push({ ...dados, nome: dados.nome.trim(), id, status: "inscricoes", inscricoes: [] });
        return { ok: true, id };
      }),
    inscreverJogador: (torneioId: string, jogadorId: string, credencial: Credencial) =>
      mutar((s) => {
        const torneio = s.torneios.find((t) => t.id === torneioId);
        if (!torneio || torneio.status === "encerrado") return erro("Torneio não aceita inscrições.");
        if (torneio.inscricoes.some((i) => i.jogadorId === jogadorId)) return erro("Jogador já inscrito.");
        const autorizacao = autorizar(s, jogadorId, credencial);
        if (!autorizacao.ok) return autorizacao;
        // inscrição tardia aumenta o campo: quem já caiu desce uma colocação
        torneio.inscricoes.forEach((i) => {
          if (i.posicao) i.posicao += 1;
        });
        torneio.inscricoes.push({ jogadorId, rebuys: 0, addon: false, status: "ativo" });
        lancar(
          contaDoJogador(s, jogadorId),
          "torneio",
          `Buy-in — ${torneio.nome}`,
          1,
          torneio.buyIn,
          { ...autorizacao.auditoria, torneioId: torneio.id }
        );
        return OK;
      }),
    registrarRebuy: (torneioId: string, jogadorId: string, credencial: Credencial) =>
      mutar((s) => {
        const torneio = s.torneios.find((t) => t.id === torneioId);
        const inscricao = torneio?.inscricoes.find((i) => i.jogadorId === jogadorId);
        if (!torneio || torneio.status !== "em_andamento" || !inscricao) return erro("Rebuy indisponível.");
        if (inscricao.addon) return erro("Depois do add-on não há mais rebuy.");
        const autorizacao = autorizar(s, jogadorId, credencial);
        if (!autorizacao.ok) return autorizacao;
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
        lancar(
          contaDoJogador(s, jogadorId),
          "torneio",
          `Rebuy — ${torneio.nome}`,
          1,
          torneio.rebuyValor,
          { ...autorizacao.auditoria, torneioId: torneio.id }
        );
        return OK;
      }),
    registrarAddon: (torneioId: string, jogadorId: string, credencial: Credencial) =>
      mutar((s) => {
        const torneio = s.torneios.find((t) => t.id === torneioId);
        const inscricao = torneio?.inscricoes.find((i) => i.jogadorId === jogadorId);
        if (!torneio || torneio.status !== "em_andamento" || !inscricao) return erro("Add-on indisponível.");
        if (inscricao.status !== "ativo") return erro("Jogador já foi eliminado.");
        if (inscricao.addon) return erro("Jogador já fez o add-on.");
        const autorizacao = autorizar(s, jogadorId, credencial);
        if (!autorizacao.ok) return autorizacao;
        inscricao.addon = true;
        lancar(
          contaDoJogador(s, jogadorId),
          "torneio",
          `Add-on — ${torneio.nome}`,
          1,
          torneio.addonValor,
          { ...autorizacao.auditoria, torneioId: torneio.id }
        );
        return OK;
      }),
    iniciarTorneio: (torneioId: string) =>
      mutar((s) => {
        const torneio = s.torneios.find((t) => t.id === torneioId);
        if (!torneio || torneio.status !== "inscricoes") return erro("Torneio não pode ser iniciado.");
        if (torneio.inscricoes.length < 2) return erro("São necessários pelo menos 2 inscritos.");
        const premiados = numeroPremiados(torneio);
        if (torneio.inscricoes.length < premiados) {
          return erro(`Há ${premiados} colocações premiadas e só ${torneio.inscricoes.length} inscritos. Diminua os premiados.`);
        }
        torneio.status = "em_andamento";
        return OK;
      }),
    /** Operador decide quantos premiar (tabela do bar) até o encerramento. */
    definirPremiados: (torneioId: string, premiados: number) =>
      mutar((s) => {
        const torneio = s.torneios.find((t) => t.id === torneioId);
        if (!torneio || torneio.status === "encerrado") return erro("Torneio já encerrado.");
        if (!torneio.premiacaoAutomatica) return erro("Este torneio usa premiação fixa.");
        if (!(Number.isInteger(premiados) && premiados >= 1 && premiados <= MAX_PREMIADOS)) {
          return erro(`Escolha de 1 a ${MAX_PREMIADOS} premiados.`);
        }
        // nas inscrições o campo ainda cresce; com o torneio rolando não pode passar dos inscritos
        if (torneio.status === "em_andamento" && premiados > torneio.inscricoes.length) {
          return erro(`Só há ${torneio.inscricoes.length} inscritos.`);
        }
        torneio.premiados = premiados;
        return OK;
      }),
    /** Rake do torneio, decidido pelo operador até o encerramento. */
    definirTaxaCasa: (torneioId: string, taxaCasaPercentual: number) =>
      mutar((s) => {
        const torneio = s.torneios.find((t) => t.id === torneioId);
        if (!torneio || torneio.status === "encerrado") return erro("Torneio já encerrado.");
        if (!(taxaCasaPercentual >= 0 && taxaCasaPercentual <= 100)) {
          return erro("A taxa da casa deve ficar entre 0 e 100%.");
        }
        torneio.taxaCasaPercentual = taxaCasaPercentual;
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
    /**
     * Desistência (não tinha o dinheiro, mudou de ideia): diferente da eliminação,
     * a inscrição some. Buy-in, rebuys e add-on saem da conta e, portanto, do prêmio.
     */
    excluirInscricao: (torneioId: string, jogadorId: string) =>
      mutar<{ estorno: number }>((s) => {
        const torneio = s.torneios.find((t) => t.id === torneioId);
        const inscricao = torneio?.inscricoes.find((i) => i.jogadorId === jogadorId);
        if (!torneio || torneio.status === "encerrado" || !inscricao) return erro("Inscrição não pode ser excluída.");
        if (torneio.status === "em_andamento" && inscricao.status === "ativo") {
          const ativos = torneio.inscricoes.filter((i) => i.status === "ativo").length;
          if (ativos <= 1) return erro("Ele é o último jogador na disputa.");
        }
        // premiação fixa não tem como reduzir colocações: o torneio ficaria sem poder encerrar
        if (
          torneio.status === "em_andamento" &&
          !torneio.premiacaoAutomatica &&
          torneio.inscricoes.length - 1 < torneio.premiacao.length
        ) {
          return erro(`A premiação fixa tem ${torneio.premiacao.length} colocações; excluir deixaria menos jogadores.`);
        }
        const contas = s.contas.filter((c) => c.jogadorId === jogadorId);
        // conta aberta: o débito simplesmente sai. Conta já fechada (ele pagou):
        // o valor volta como crédito na conta aberta e é pago no fechamento dela.
        // Estornos de exclusões anteriores (desistiu, voltou, desistiu de novo) são
        // descontados, para não devolver duas vezes o mesmo pagamento.
        let jaPago = 0;
        contas.forEach((c) => {
          const debitos = c.lancamentos.filter((l) => ehDebitoDoTorneio(l, torneio));
          jaPago += c.lancamentos
            .filter((l) => l.tipo === "torneio" && l.valorUnitario < 0 && l.torneioId === torneio.id)
            .reduce((soma, l) => soma + totalLancamento(l), 0);
          if (c.status === "fechada") {
            jaPago += debitos.reduce((soma, l) => soma + totalLancamento(l), 0);
          } else {
            c.lancamentos = c.lancamentos.filter((l) => !debitos.includes(l));
          }
        });
        jaPago = Math.max(0, Math.round(jaPago * 100) / 100);
        if (jaPago > 0) {
          lancar(contaDoJogador(s, jogadorId), "torneio", `Estorno da inscrição — ${torneio.nome}`, 1, -jaPago, {
            operador: s.operador,
            torneioId: torneio.id,
          });
        }
        // o campo diminui: quem caiu antes dele (colocação maior) sobe uma posição
        const posicaoExcluida = inscricao.posicao ?? 0;
        torneio.inscricoes = torneio.inscricoes.filter((i) => i.jogadorId !== jogadorId);
        torneio.inscricoes.forEach((i) => {
          if (i.posicao && i.posicao > posicaoExcluida) i.posicao -= 1;
        });
        return { ok: true, estorno: jaPago };
      }),
    /** Corrige um toque errado: o jogador volta para a disputa sem pagar rebuy. */
    desfazerEliminacao: (torneioId: string, jogadorId: string) =>
      mutar((s) => {
        const torneio = s.torneios.find((t) => t.id === torneioId);
        const inscricao = torneio?.inscricoes.find((i) => i.jogadorId === jogadorId);
        if (!torneio || torneio.status !== "em_andamento" || !inscricao) return erro("Torneio não está em andamento.");
        if (inscricao.status !== "eliminado") return erro("Jogador não está eliminado.");
        // quem caiu depois dele desce uma colocação para as posições não se repetirem
        const posicaoAnterior = inscricao.posicao;
        if (posicaoAnterior) {
          torneio.inscricoes.forEach((i) => {
            if (i.posicao && i.posicao < posicaoAnterior) i.posicao += 1;
          });
        }
        inscricao.status = "ativo";
        inscricao.posicao = undefined;
        return OK;
      }),
    /** Define o campeão e credita os prêmios nas contas dos jogadores premiados. */
    encerrarTorneio: (torneioId: string) =>
      mutar((s) => {
        const torneio = s.torneios.find((t) => t.id === torneioId);
        if (!torneio || torneio.status !== "em_andamento") return erro("Torneio não está em andamento.");
        const ativos = torneio.inscricoes.filter((i) => i.status === "ativo");
        if (ativos.length !== 1) return erro("Elimine os jogadores até restar só o campeão.");
        // exclusões depois do início podem deixar menos jogadores que colocações premiadas
        if (torneio.inscricoes.length < numeroPremiados(torneio)) {
          return erro("Há mais colocações premiadas que jogadores. Diminua os premiados.");
        }
        ativos[0].posicao = 1;
        const { premios, percentuais } = resumoTorneio(torneio);
        // congela a premiação sugerida: o histórico não muda mais com a tabela
        torneio.premiacao = percentuais;
        torneio.premiacaoAutomatica = false;
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
    if (resultado.ok || resultado.persistir) gravar(rascunho);
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