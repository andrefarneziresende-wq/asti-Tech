const GITHUB_API = "https://api.github.com";

function githubHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN não configurado.");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function repoInfo(): { owner: string; repo: string } {
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  if (!owner || !repo) {
    throw new Error("GITHUB_REPO_OWNER / GITHUB_REPO_NAME não configurados.");
  }
  return { owner, repo };
}

// Branch dedicado só para os mockups gerados pelo robô, separado da main —
// assim commitar um mockup novo não dispara um redeploy do site no Vercel a
// cada lead processado.
const MOCKUPS_BRANCH = process.env.GITHUB_MOCKUPS_BRANCH ?? "mockups";

async function ensureBranchExists(owner: string, repo: string, branch: string): Promise<void> {
  const existing = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${branch}`, {
    headers: githubHeaders(),
  });
  if (existing.ok) return;

  const mainRef = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/main`, {
    headers: githubHeaders(),
  });
  if (!mainRef.ok) {
    throw new Error(`Não foi possível ler a branch "main" pra criar a branch "${branch}" (${mainRef.status}).`);
  }
  const { object } = (await mainRef.json()) as { object: { sha: string } };

  const createRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers: githubHeaders(),
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: object.sha }),
  });
  if (!createRes.ok && createRes.status !== 422) {
    const body = await createRes.text().catch(() => "");
    throw new Error(`Falha ao criar a branch "${branch}" (${createRes.status}): ${body}`);
  }
}

async function putFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string
): Promise<void> {
  const contentsUrl = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;

  const existing = await fetch(`${contentsUrl}?ref=${MOCKUPS_BRANCH}`, { headers: githubHeaders() });
  const existingSha = existing.ok ? ((await existing.json()) as { sha: string }).sha : undefined;

  const putRes = await fetch(contentsUrl, {
    method: "PUT",
    headers: githubHeaders(),
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf-8").toString("base64"),
      branch: MOCKUPS_BRANCH,
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });

  if (!putRes.ok) {
    const body = await putRes.text().catch(() => "");
    throw new Error(`Falha ao enviar "${path}" para o GitHub (${putRes.status}): ${body}`);
  }
}

interface PublishMockupInput {
  slug: string;
  htmlContent: string;
  claudeMd: string;
}

/**
 * Commita o mockup gerado (index.html) e um CLAUDE.md com o contexto do
 * negócio como arquivos dentro do repositório existente (branch "mockups"),
 * em vez de criar um repositório novo — o token fine-grained usado aqui não
 * tem permissão de criar repositórios, só de ler/escrever conteúdo nos
 * repositórios já selecionados. O CLAUDE.md serve pra, se o cliente aceitar
 * a proposta, quem continuar o desenvolvimento (inclusive via Claude Code)
 * já ter o contexto do negócio sem precisar recriar do zero.
 */
export async function publishMockup(input: PublishMockupInput): Promise<{ repoUrl: string }> {
  const { owner, repo } = repoInfo();
  await ensureBranchExists(owner, repo, MOCKUPS_BRANCH);

  const basePath = `leads/${input.slug}`;
  await putFile(owner, repo, `${basePath}/index.html`, input.htmlContent, "Mockup gerado/atualizado pela ASTI Tech");
  await putFile(owner, repo, `${basePath}/CLAUDE.md`, input.claudeMd, "Contexto do negócio gerado pela ASTI Tech");

  return { repoUrl: `https://github.com/${owner}/${repo}/blob/${MOCKUPS_BRANCH}/${basePath}/index.html` };
}
