"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Delete, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePoker } from "@/lib/poker-demo/store";
import type { Credencial, Resultado } from "@/lib/poker-demo/types";
import { cn } from "@/lib/utils";

type Pedido = {
  jogadorId: string;
  /** o que está sendo autorizado, ex.: "Rebuy — Torneio de Terça" */
  titulo: string;
  /** valor ou detalhe em destaque, ex.: "R$ 80,00" */
  detalhe?: string;
  /** roda a ação com a credencial digitada; o diálogo só fecha se der certo */
  executar: (credencial: Credencial) => Resultado;
  onSucesso?: () => void;
};

const PinGateContext = createContext<((pedido: Pedido) => void) | null>(null);

/**
 * Buy-in, rebuy, add-on e cacife viram dívida na conta do jogador, então quem
 * autoriza é ele: digita o próprio PIN no aparelho do operador.
 */
export function PinGateProvider({ children }: { children: React.ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [open, setOpen] = useState(false);
  // muda a cada pedido para o formulário nascer zerado
  const [vez, setVez] = useState(0);

  const pedirPin = useCallback((novo: Pedido) => {
    setPedido(novo);
    setVez((atual) => atual + 1);
    setOpen(true);
  }, []);

  return (
    <PinGateContext.Provider value={pedirPin}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs">
          {pedido && (
            <PinForm
              key={vez}
              pedido={pedido}
              onSucesso={() => {
                setOpen(false);
                pedido.onSucesso?.();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </PinGateContext.Provider>
  );
}

export function usePinGate() {
  const pedirPin = useContext(PinGateContext);
  if (!pedirPin) throw new Error("usePinGate precisa estar dentro de PinGateProvider");
  return pedirPin;
}

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

function PinForm({ pedido, onSucesso }: { pedido: Pedido; onSucesso: () => void }) {
  const { state } = usePoker();
  const jogador = state.jogadores.find((j) => j.id === pedido.jogadorId);
  const semPin = !jogador?.pin;

  const [modoGerente, setModoGerente] = useState(false);
  const [digitos, setDigitos] = useState("");
  // criação de PIN no primeiro uso: guarda a 1ª digitação para confirmar
  const [primeiro, setPrimeiro] = useState<string | null>(null);
  const [senhaGerente, setSenhaGerente] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function tentar(credencial: Credencial) {
    const resultado = pedido.executar(credencial);
    if (resultado.ok) {
      onSucesso();
      return;
    }
    setErro(resultado.error);
    setDigitos("");
    setPrimeiro(null);
    setSenhaGerente("");
  }

  function completar(pin: string) {
    if (!semPin) {
      tentar({ pin });
      return;
    }
    if (primeiro === null) {
      setPrimeiro(pin);
      setDigitos("");
      setErro(null);
      return;
    }
    if (pin !== primeiro) {
      setErro("Os dois PINs não são iguais. Comece de novo.");
      setPrimeiro(null);
      setDigitos("");
      return;
    }
    tentar({ novoPin: pin });
  }

  function digitar(tecla: string) {
    if (digitos.length >= 4) return;
    const proximo = digitos + tecla;
    setErro(null);
    if (proximo.length === 4) completar(proximo);
    else setDigitos(proximo);
  }

  function teclado(event: React.KeyboardEvent) {
    if (/^\d$/.test(event.key)) digitar(event.key);
    else if (event.key === "Backspace") setDigitos((atual) => atual.slice(0, -1));
  }

  const instrucao = semPin
    ? primeiro === null
      ? "Primeiro uso: o jogador cria um PIN de 4 dígitos."
      : "Digite o mesmo PIN de novo para confirmar."
    : "O jogador digita o próprio PIN para autorizar.";

  return (
    <>
      <DialogHeader>
        <DialogTitle>{pedido.titulo}</DialogTitle>
        <DialogDescription>
          {jogador?.nome ?? "Jogador"}
          {pedido.detalhe && (
            <>
              {" · "}
              <span className="font-money text-foreground">{pedido.detalhe}</span>
            </>
          )}
        </DialogDescription>
      </DialogHeader>

      {modoGerente ? (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            tentar({ senhaGerente });
          }}
        >
          <p className="text-sm text-muted-foreground">
            Liberação sem o PIN do jogador. Fica registrada como autorizada pelo gerente.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="pin-senha-gerente">Senha de gerente</Label>
            <Input
              id="pin-senha-gerente"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              className="h-12 text-lg"
              value={senhaGerente}
              onChange={(event) => {
                setSenhaGerente(event.target.value);
                setErro(null);
              }}
            />
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <Button type="submit" className="h-12" disabled={!senhaGerente}>
            <ShieldCheck /> Liberar lançamento
          </Button>
          <Button type="button" variant="ghost" className="h-11" onClick={() => setModoGerente(false)}>
            Voltar para o PIN do jogador
          </Button>
        </form>
      ) : (
        // tabIndex + onKeyDown: no computador dá para digitar o PIN pelo teclado físico
        <div className="grid gap-3 outline-none" tabIndex={0} onKeyDown={teclado} autoFocus>
          <p className="text-center text-sm text-muted-foreground">{instrucao}</p>
          <div className="flex justify-center gap-3 py-1" aria-label={`${digitos.length} de 4 dígitos`}>
            {[0, 1, 2, 3].map((indice) => (
              <span
                key={indice}
                className={cn(
                  "size-4 rounded-full ring-2 ring-primary/40",
                  indice < digitos.length && "bg-primary ring-primary"
                )}
              />
            ))}
          </div>
          <p className={cn("min-h-5 text-center text-sm text-destructive", !erro && "invisible")}>
            {erro ?? "—"}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TECLAS.map((tecla) => (
              <Button
                key={tecla}
                type="button"
                variant="secondary"
                className="h-14 font-money text-2xl"
                onClick={() => digitar(tecla)}
              >
                {tecla}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              className="h-14 text-xs"
              onClick={() => {
                setDigitos("");
                setErro(null);
              }}
            >
              Limpar
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-14 font-money text-2xl"
              onClick={() => digitar("0")}
            >
              0
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-14"
              aria-label="Apagar último dígito"
              onClick={() => setDigitos((atual) => atual.slice(0, -1))}
            >
              <Delete className="size-6" />
            </Button>
          </div>
          <Button type="button" variant="ghost" className="h-11" onClick={() => setModoGerente(true)}>
            Liberar com senha de gerente
          </Button>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Demonstração: PIN dos jogadores de exemplo 1111 · gerente 9999
      </p>
    </>
  );
}
