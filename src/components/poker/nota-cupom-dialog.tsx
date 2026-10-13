"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FORMA_LABEL, totalLancamento } from "@/lib/poker-demo/calc";
import { usePoker } from "@/lib/poker-demo/store";
import type { NotaFiscal } from "@/lib/poker-demo/types";
import { formatCurrency, formatDateTime } from "@/lib/format";

export function NotaCupomDialog({
  nota,
  open,
  onOpenChange,
}: {
  nota?: NotaFiscal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state } = usePoker();
  const conta = nota ? state.contas.find((c) => c.id === nota.contaId) : undefined;
  // fichas e torneio não são venda de mercadoria: só o consumo de bar aparece no cupom
  const itens = conta?.lancamentos.filter((l) => l.tipo === "produto") ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cupom fiscal</DialogTitle>
          <DialogDescription>Prévia de como a NFC-e sai para o cliente.</DialogDescription>
        </DialogHeader>

        {nota && (
          // papel de cupom: claro de propósito, mesmo com o app em tema escuro
          <div className="rounded-md bg-[#f6f1e4] p-4 font-mono text-xs leading-relaxed text-neutral-900">
            <div className="border-2 border-dashed border-neutral-900 px-2 py-1.5 text-center text-[0.7rem] font-bold">
              DOCUMENTO DE DEMONSTRAÇÃO — SEM VALOR FISCAL
            </div>

            <div className="mt-3 text-center">
              <div className="text-sm font-bold">TEXAS BEER — WB POKER</div>
              <div>NFC-e nº {nota.numero}</div>
              <div>Emissão: {formatDateTime(nota.emitidaEm)}</div>
              {conta && <div>Conta #{conta.numero}</div>}
            </div>

            {nota.status === "cancelada" && (
              <div className="mt-3 border-y-2 border-red-700 py-1 text-center text-sm font-bold text-red-700">
                NOTA CANCELADA
              </div>
            )}

            <div className="mt-3 border-t border-dashed border-neutral-500 pt-2">
              <div className="flex justify-between gap-2 font-bold">
                <span>ITEM</span>
                <span>TOTAL</span>
              </div>
              {itens.length === 0 ? (
                <div className="py-2 text-neutral-600">Itens da conta não encontrados.</div>
              ) : (
                itens.map((item) => (
                  <div key={item.id} className="mt-1.5">
                    <div className="break-words">{item.descricao}</div>
                    <div className="flex justify-between gap-2 text-neutral-700">
                      <span>
                        {item.quantidade} x {formatCurrency(item.valorUnitario)}
                      </span>
                      <span>{formatCurrency(totalLancamento(item))}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-2 flex justify-between gap-2 border-t border-dashed border-neutral-500 pt-2 text-sm font-bold">
              <span>TOTAL</span>
              <span>{formatCurrency(nota.valor)}</span>
            </div>
            {conta?.formaPagamento && (
              <div className="flex justify-between gap-2">
                <span>Forma de pagamento</span>
                <span>{FORMA_LABEL[conta.formaPagamento]}</span>
              </div>
            )}

            <div className="mt-2 border-t border-dashed border-neutral-500 pt-2">
              <div>Consumidor: {nota.jogadorNome}</div>
              <div>{nota.cpf ? `CPF: ${nota.cpf}` : "Consumidor não identificado"}</div>
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" className="h-11 px-4" />}>Fechar</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
