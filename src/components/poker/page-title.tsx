import { BackLink } from "@/components/back-link";

export function PageTitle({
  title,
  description,
  backHref = "/poker",
  backLabel = "Início",
  children,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  /** ações da página (botões), alinhadas à direita */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <BackLink href={backHref} label={backLabel} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
