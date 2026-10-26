import type { Metadata } from "next";
import { PokerDemoProvider } from "@/lib/poker-demo/store";
import { PinGateProvider } from "@/components/poker/pin-gate";
import { PokerHeader } from "@/components/poker/poker-header";

export const metadata: Metadata = {
  title: "WB Poker — Texas Beer",
  description: "Gestão do poker do Texas Beer: caixa, jogadores, cacifes e torneios",
};

export default function PokerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PokerDemoProvider>
      <PinGateProvider>
        <div className="flex flex-1 flex-col">
          <PokerHeader />
          <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">{children}</main>
          <footer className="px-4 pb-4 text-center text-xs text-muted-foreground">
            Dados salvos só neste aparelho. Faça o backup em Senha e backup no fim da noite.
          </footer>
        </div>
      </PinGateProvider>
    </PokerDemoProvider>
  );
}
