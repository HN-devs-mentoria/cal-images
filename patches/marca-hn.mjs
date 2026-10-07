// Marca HN no cal: logo do login, fundo das páginas públicas, sem "Sobrepor meu calendário".
// Roda em cal/. Cada troca exige achar o trecho exatamente uma vez — se o upstream mudar, o build quebra aqui.
import fs from "node:fs";

const HN = "../patch/hn";
function trocar(arquivo, de, para) {
  const src = fs.readFileSync(arquivo, "utf8");
  const n = src.split(de).length - 1;
  if (n !== 1) throw new Error(`${arquivo}: esperava 1 ocorrência de ${JSON.stringify(de)}, achei ${n}`);
  fs.writeFileSync(arquivo, src.replace(de, para));
}
function exigir(arquivo) {
  if (!fs.existsSync(arquivo)) throw new Error(`alvo sumiu no upstream: ${arquivo}`);
}

// 1. "Sobrepor meu calendário": o slot renderOverlay do Booker some; os 3 botões de visualização ficam.
trocar("apps/web/modules/bookings/components/Booker.tsx", "if (isEmbed) return null;", "if (isEmbed || true) return null;");

// 2. Logo do login (/api/logo lê esse arquivo).
exigir("apps/web/public/calcom-logo-white-word.svg");
fs.copyFileSync(`${HN}/calcom-logo-white-word.svg`, "apps/web/public/calcom-logo-white-word.svg");

// 3. Fundo das páginas públicas.
fs.mkdirSync("apps/web/public/hn", { recursive: true });
fs.copyFileSync(`${HN}/logo-mark-hero.png`, "apps/web/public/hn/logo-mark-hero.png");
fs.copyFileSync(`${HN}/HnFundoPublico.tsx`, "apps/web/components/HnFundoPublico.tsx");
exigir("apps/web/styles/globals.css");
fs.appendFileSync("apps/web/styles/globals.css", fs.readFileSync(`${HN}/hn-publico.css`, "utf8"));
const layout = "apps/web/app/(booking-page-wrapper)/layout.tsx";
trocar(layout, 'import PageWrapper from "@components/PageWrapperAppDir";',
  'import HnFundoPublico from "@components/HnFundoPublico";\nimport PageWrapper from "@components/PageWrapperAppDir";');
trocar(layout, "        {children}\n", "        <HnFundoPublico />\n        {children}\n");

console.log("marca-hn: ok");
