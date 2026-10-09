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

// 2. Logo HN: /api/logo lê esse arquivo; o login tem "Cal.diy" escrito à mão num <h1>.
exigir("apps/web/public/calcom-logo-white-word.svg");
fs.copyFileSync(`${HN}/calcom-logo-white-word.svg`, "apps/web/public/calcom-logo-white-word.svg");
trocar("apps/web/modules/auth/login-view.tsx",
  '<h1 className="font-cal text-xl font-bold text-emphasis">Cal.diy</h1>',
  '<h1><img src="/calcom-logo-white-word.svg" alt="Henrique Niada" className="mx-auto h-8 w-auto dark:invert" /></h1>');

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

// 4. Nome do app (título "Login | H.Niada") e sem "Criar Conta": o Next grava NEXT_PUBLIC_* no build,
//    e o Dockerfile não repassa esses dois — então entram como ENV no estágio builder.
//    DISABLE_SIGNUP também fecha /signup e a API de cadastro no servidor; conta nova só pelo admin.
trocar("Dockerfile", "ENV NEXT_PUBLIC_WEBAPP_URL=http://NEXT_PUBLIC_WEBAPP_URL_PLACEHOLDER \\\n",
  'ENV NEXT_PUBLIC_APP_NAME="H.Niada" NEXT_PUBLIC_DISABLE_SIGNUP=true\nENV NEXT_PUBLIC_WEBAPP_URL=http://NEXT_PUBLIC_WEBAPP_URL_PLACEHOLDER \\\n');

// 5. Página de reserva confirmada: sem o convite "Crie o seu próprio link para reservas"
//    (o cadastro é fechado; o convite levaria a uma tela que recusa) e sem o aviso da
//    política de spam do Google (assusta o mentorado e o "Resolver" leva ao cal.com).
const confirmada = "apps/web/modules/bookings/views/bookings-single-view.tsx";
trocar(confirmada, "{session === null && !(userIsOwner || props.hideBranding) && (",
  "{false && session === null && !(userIsOwner || props.hideBranding) && (");
trocar(confirmada, "{isGmail && !isFeedbackMode && (", "{false && isGmail && !isFeedbackMode && (");

// 6. Google Agenda: o próprio Google envia o convite ao convidado (criar, alterar,
//    cancelar). O cal cria o evento com sendUpdates "none" porque espera mandar os
//    próprios e-mails; sem SMTP ninguém avisava, e o Google só põe na agenda convite
//    de remetente conhecido — o convidado ficava sem e-mail e sem compromisso.
const gcal = "packages/app-store/googlecalendar/lib/CalendarService.ts";
trocar(gcal, 'conferenceDataVersion: 1,\n          sendUpdates: "none",', 'conferenceDataVersion: 1,\n          sendUpdates: "all",');
trocar(gcal, 'sendNotifications: true,\n        sendUpdates: "none",', 'sendNotifications: true,\n        sendUpdates: "all",');
trocar(gcal, 'sendNotifications: false,\n        sendUpdates: "none",', 'sendNotifications: false,\n        sendUpdates: "all",');

// 7. Imagem base pelo espelho do Google: o Docker Hub limita download anônimo por IP
//    e os runners do GitHub compartilham IP — o build falhava com 429 antes de começar.
//    mirror.gcr.io/library/node:20 é a mesma imagem oficial, sem esse limite.
const MIRROR = "mirror.gcr.io/library/node:20";
trocar("Dockerfile", "FROM --platform=$BUILDPLATFORM node:20 AS builder", `FROM --platform=$BUILDPLATFORM ${MIRROR} AS builder`);
trocar("Dockerfile", "FROM node:20 AS builder-two", `FROM ${MIRROR} AS builder-two`);
trocar("Dockerfile", "FROM node:20 AS runner", `FROM ${MIRROR} AS runner`);

console.log("marca-hn: ok");
