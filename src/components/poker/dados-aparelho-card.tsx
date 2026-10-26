"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Eraser, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SENHA_GERENTE_EXEMPLO, exportarBackup, restaurarBackup, usePoker } from "@/lib/poker-demo/store";
import type { Resultado } from "@/lib/poker-demo/types";

/**
 * Tudo fica só no navegador deste aparelho: o backup é a única cópia fora dele.
 * Também é aqui que se troca os dados de exemplo pelo uso de verdade.
 */
export function DadosAparelhoCard() {
  const { state, actions } = usePoker();
  // ainda com a senha de gerente de exemplo = dados de demonstração
  const emDemonstracao = state.senhaGerente === SENHA_GERENTE_EXEMPLO;
  const arquivo = useRef<HTMLInputElement>(null);
  const [backupLido, setBackupLido] = useState<string | null>(null);
  const [zerarAberto, setZerarAberto] = useState(false);
  const [exemploAberto, setExemploAberto] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaGerente, setSenhaGerente] = useState("");

  function limparSenhas() {
    setSenhaAtual("");
    setSenha("");
    setSenhaGerente("");
  }

  async function baixar() {
    const quando = new Date().toLocaleString("sv-SE").slice(0, 16).replace(" ", "_").replace(":", "h");
    const backup = new File([exportarBackup()], `wb-poker-backup_${quando}.json`, { type: "application/json" });

    // celular e tablet: abre o menu de compartilhar (WhatsApp, e-mail, Arquivos)
    if (navigator.canShare?.({ files: [backup] })) {
      try {
        await navigator.share({ files: [backup], title: "Backup WB Poker" });
        toast.success("Backup enviado.");
        return;
      } catch (erro) {
        if (erro instanceof DOMException && erro.name === "AbortError") return;
        // sem permissão de compartilhar: cai no download
      }
    }

    const url = URL.createObjectURL(backup);
    const link = document.createElement("a");
    link.href = url;
    link.download = backup.name;
    link.click();
    // no celular o download começa depois do clique: revogar na hora gera arquivo vazio
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    toast.success("Backup baixado. Guarde o arquivo fora do aparelho (WhatsApp, e-mail ou Drive).");
  }

  async function escolherArquivo(event: React.ChangeEvent<HTMLInputElement>) {
    const escolhido = event.target.files?.[0];
    event.target.value = "";
    if (escolhido) setBackupLido(await escolhido.text());
  }

  function avisar(resultado: Resultado, sucesso: string) {
    if (!resultado.ok) {
      toast.error(resultado.error);
      return false;
    }
    toast.success(sucesso);
    return true;
  }

  function restaurar() {
    if (!backupLido) return;
    avisar(restaurarBackup(backupLido), "Backup restaurado.");
    setBackupLido(null);
  }

  function zerar(event: React.FormEvent) {
    event.preventDefault();
    const resultado = actions.comecarDoZero(senhaAtual, senha, senhaGerente);
    if (!avisar(resultado, "Pronto para usar. O cardápio foi mantido; confira os preços em Produtos.")) return;
    setZerarAberto(false);
    limparSenhas();
  }

  function voltarAoExemplo(event: React.FormEvent) {
    event.preventDefault();
    if (!avisar(actions.resetarDemo(senhaAtual), "Dados de exemplo restaurados.")) return;
    setExemploAberto(false);
    limparSenhas();
  }

  const campoSenhaAtual = (
    <div className="space-y-1.5">
      <Label htmlFor="dados-senha-atual">Senha atual do operador</Label>
      <Input
        id="dados-senha-atual"
        type="password"
        autoComplete="current-password"
        className="h-11"
        value={senhaAtual}
        onChange={(event) => setSenhaAtual(event.target.value)}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados deste aparelho</CardTitle>
        <CardDescription>
          Jogadores, contas, caixa e torneios ficam salvos só neste aparelho. Faça o backup no fim de cada noite e
          guarde fora dele.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        <Button className="h-11 px-4" onClick={baixar}>
          <Download /> Fazer backup
        </Button>
        <Button variant="outline" className="h-11 px-4" onClick={() => arquivo.current?.click()}>
          <Upload /> Restaurar backup
        </Button>
        <input ref={arquivo} type="file" accept="application/json,.json" className="hidden" onChange={escolherArquivo} />

        {emDemonstracao && (
          <Dialog
            open={zerarAberto}
            onOpenChange={(aberto) => {
              setZerarAberto(aberto);
              if (!aberto) limparSenhas();
            }}
          >
            <DialogTrigger render={<Button variant="outline" className="h-11 px-4" />}>
              <Eraser /> Começar do zero
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={zerar} className="grid gap-4">
                <DialogHeader>
                  <DialogTitle>Começar do zero?</DialogTitle>
                  <DialogDescription>
                    Apaga jogadores, contas, caixa, torneios e notas deste aparelho. O cardápio fica. Escolha as
                    senhas de verdade, porque as de exemplo aparecem na tela.
                  </DialogDescription>
                </DialogHeader>
                {campoSenhaAtual}
                <div className="space-y-1.5">
                  <Label htmlFor="zerar-senha">Nova senha do operador</Label>
                  <Input
                    id="zerar-senha"
                    type="password"
                    autoComplete="new-password"
                    className="h-11"
                    value={senha}
                    onChange={(event) => setSenha(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zerar-gerente">Nova senha de gerente (só números)</Label>
                  <Input
                    id="zerar-gerente"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    className="h-11"
                    value={senhaGerente}
                    onChange={(event) => setSenhaGerente(event.target.value.replace(/\D/g, ""))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Libera lançamento quando o jogador não tem o PIN. Não mostre para os jogadores.
                  </p>
                </div>
                <DialogFooter>
                  <DialogClose render={<Button type="button" variant="outline" className="h-11 px-4" />}>
                    Cancelar
                  </DialogClose>
                  <Button
                    type="submit"
                    variant="destructive"
                    className="h-11 px-4"
                    disabled={!senhaAtual || !senha || !senhaGerente}
                  >
                    Apagar e começar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        <Dialog
          open={exemploAberto}
          onOpenChange={(aberto) => {
            setExemploAberto(aberto);
            if (!aberto) limparSenhas();
          }}
        >
          <DialogTrigger render={<Button variant="ghost" className="h-11 px-4" />}>
            <RotateCcw /> Voltar aos dados de exemplo
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={voltarAoExemplo} className="grid gap-4">
              <DialogHeader>
                <DialogTitle>Voltar aos dados de exemplo?</DialogTitle>
                <DialogDescription>
                  Tudo o que foi lançado neste aparelho será apagado e as senhas voltam a ser as de exemplo.
                  {!emDemonstracao && " Faça um backup antes se precisar dos dados."}
                </DialogDescription>
              </DialogHeader>
              {campoSenhaAtual}
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" className="h-11 px-4" />}>
                  Cancelar
                </DialogClose>
                <Button type="submit" variant="destructive" className="h-11 px-4" disabled={!senhaAtual}>
                  Voltar ao exemplo
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>

      <Dialog open={backupLido !== null} onOpenChange={(aberto) => !aberto && setBackupLido(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar este backup?</DialogTitle>
            <DialogDescription>
              Tudo o que está neste aparelho agora será trocado pelo conteúdo do arquivo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="h-11 px-4" />}>Cancelar</DialogClose>
            <Button variant="destructive" className="h-11 px-4" onClick={restaurar}>
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
