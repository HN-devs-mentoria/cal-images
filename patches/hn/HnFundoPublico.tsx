"use client";

import { useIsEmbed } from "@calcom/embed-core/embed-iframe";

// Fundo das páginas públicas: o .app-bg da área de membros + o emblema do card
// principal do dashboard no canto inferior direito. Fora do embed, que é transparente.
export default function HnFundoPublico() {
  const isEmbed = useIsEmbed();
  if (isEmbed) return null;
  return (
    <div className="hn-fundo" aria-hidden="true">
      <div className="hn-emblema">
        <span className="hn-onda" />
        <span className="hn-onda" />
        <span className="hn-onda" />
        <img src="/hn/logo-mark-hero.png" alt="" />
      </div>
    </div>
  );
}
