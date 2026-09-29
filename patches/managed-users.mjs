// Implementa createNewUsersConnectToOrgIfExists, que o cal.diy deixou como stub.
//
// POR QUE ISTO EXISTE
// O fork removeu Organizations (recurso comercial) e, junto, a criação de
// usuários gerenciados. Sem ela, os atoms não autenticam e o mentor precisaria
// usar a interface do cal.com. O cal.diy é MIT, então podemos escrever a nossa.
//
// LIMITE LEGAL: esta implementação é ORIGINAL. A versão do cal.com vive na
// pasta ee/ sob licença comercial e não pode ser copiada.
//
// Falha em voz alta se o upstream mudar o stub — é de propósito: melhor quebrar
// o build do que produzir uma imagem em que a função silenciosamente não existe.

import { readFileSync, writeFileSync } from "node:fs";

const ARQUIVO = "packages/platform/libraries/index.ts";

const STUB = `}): Promise<{ id: number; email: string; username: string }[]> {
  throw new Error("Organization user creation is not available in community edition");
}`;

const IMPLEMENTACAO = `}): Promise<{ id: number; email: string; username: string }[]> {
  // ===== implementação própria (patch HN) =====
  const {
    invitations,
    teamId,
    isOrg,
    parentId,
    orgConnectInfoByUsernameOrEmail,
    isPlatformManaged,
    timeFormat,
    weekStart,
    timeZone,
    language,
    creationSource,
  } = _args;

  const prismaMod: any = await import("@calcom/prisma");
  const prisma = prismaMod.default ?? prismaMod.prisma;

  // slugify local em vez de importado: menos superfície para quebrar quando o
  // upstream move arquivos.
  const paraSlug = (texto: string): string =>
    (texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "user";

  const criados: { id: number; email: string; username: string }[] = [];

  for (const convite of invitations as { usernameOrEmail: string; role: any }[]) {
    const email = String(convite.usernameOrEmail).toLowerCase();
    const info = orgConnectInfoByUsernameOrEmail?.[convite.usernameOrEmail];
    const organizationId = info?.orgId ?? (isOrg ? teamId : parentId ?? undefined);

    // users e Profile são unique em [username, organizationId] — a unicidade é
    // POR organização, não global. Basta resolver colisão dentro dela.
    const base = paraSlug(email.split("@")[0]);
    let username = base;
    let n = 1;
    while (
      await prisma.user.findFirst({
        where: { username, organizationId: organizationId ?? null },
        select: { id: true },
      })
    ) {
      username = base + "-" + ++n;
    }

    const usuario = await prisma.user.create({
      data: {
        email,
        username,
        organizationId: organizationId ?? null,
        isPlatformManaged: !!isPlatformManaged,
        // Usuário gerenciado nunca confirma e-mail nem passa por onboarding:
        // ele não faz login na interface do cal.
        emailVerified: new Date(),
        completedOnboarding: true,
        identityProvider: "CAL",
        ...(creationSource ? { creationSource } : {}),
        ...(language ? { locale: language } : {}),
        ...(timeZone ? { timeZone } : {}),
        ...(weekStart ? { weekStart } : {}),
        ...(typeof timeFormat === "number" ? { timeFormat } : {}),
      },
      select: { id: true, email: true, username: true },
    });

    if (organizationId) {
      await prisma.profile.create({
        data: {
          uid: "usr-" + globalThis.crypto.randomUUID(),
          userId: usuario.id,
          organizationId,
          username,
        },
      });
    }

    await prisma.membership.create({
      data: {
        teamId,
        userId: usuario.id,
        role: convite.role,
        accepted: info?.autoAccept ?? true,
      },
    });

    criados.push({ id: usuario.id, email: usuario.email, username: usuario.username || username });
  }

  return criados;
}`;

const texto = readFileSync(ARQUIVO, "utf8");

if (!texto.includes(STUB)) {
  console.error(
    "PATCH FALHOU: o stub de createNewUsersConnectToOrgIfExists mudou no upstream.\n" +
      "Confira " + ARQUIVO + " e atualize patches/managed-users.mjs antes de seguir."
  );
  process.exit(1);
}

writeFileSync(ARQUIVO, texto.replace(STUB, IMPLEMENTACAO));
console.log("patch aplicado: createNewUsersConnectToOrgIfExists implementada");
