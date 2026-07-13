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

interface CreateSiteRepoInput {
  slug: string;
  description: string;
  htmlContent: string;
}

/**
 * Cria um repositório privado (na org GITHUB_ORG, se configurada, ou na conta
 * dona do token) e commita o mockup gerado como index.html. O código fica
 * salvo no GitHub para o cliente poder evoluir com ou sem a ASTI Tech depois;
 * a publicação/preview do mockup em si acontece no próprio site (rota /[slug]),
 * não via GitHub Pages.
 */
export async function createSiteRepo(input: CreateSiteRepoInput): Promise<{ repoUrl: string }> {
  const org = process.env.GITHUB_ORG;
  const createUrl = org ? `${GITHUB_API}/orgs/${org}/repos` : `${GITHUB_API}/user/repos`;

  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: githubHeaders(),
    body: JSON.stringify({
      name: input.slug,
      description: input.description,
      private: true,
      auto_init: false,
    }),
  });

  if (!createRes.ok) {
    const body = await createRes.text().catch(() => "");
    throw new Error(`Falha ao criar repositório no GitHub (${createRes.status}): ${body}`);
  }

  const repo = await createRes.json();
  const owner = repo.owner.login as string;
  const repoName = repo.name as string;

  const commitRes = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/contents/index.html`, {
    method: "PUT",
    headers: githubHeaders(),
    body: JSON.stringify({
      message: "Mockup inicial gerado pela ASTI Tech",
      content: Buffer.from(input.htmlContent, "utf-8").toString("base64"),
    }),
  });

  if (!commitRes.ok) {
    const body = await commitRes.text().catch(() => "");
    throw new Error(`Falha ao enviar o código para o GitHub (${commitRes.status}): ${body}`);
  }

  return { repoUrl: repo.html_url as string };
}
