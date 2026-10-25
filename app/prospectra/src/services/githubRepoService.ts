import type { UserProject } from "../types/projects";

/**
 * Extract clean GitHub username from a URL, handle, or string.
 */
export function extractGithubUsername(
  githubUrlOrHandle?: string | null,
): string | null {
  if (!githubUrlOrHandle) return null;
  const trimmed = githubUrlOrHandle.trim();
  if (!trimmed) return null;

  // If full URL e.g. https://github.com/username or github.com/username
  const match = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i,
  );
  if (match && match[1]) {
    return match[1];
  }

  // Handle bare username e.g. @username or username
  const cleanHandle = trimmed.replace(/^@/, "").replace(/\/+$/, "");
  if (/^[a-zA-Z0-9_-]{1,39}$/.test(cleanHandle)) {
    return cleanHandle;
  }

  return null;
}

/**
 * Fetch public GitHub repositories for a given username and map them to UserProject items.
 */
export async function fetchUserGithubRepos(
  username: string,
): Promise<UserProject[]> {
  const clean = username.trim().replace(/^@/, "");
  if (!clean) return [];

  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(clean)}/repos?sort=updated&per_page=30`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!res.ok) {
      console.warn(`GitHub API repos error: ${res.status}`);
      return [];
    }

    const repos = await res.json();
    if (!Array.isArray(repos)) return [];

    return repos
      // Filter out forks if there are original repos available
      .filter((repo: any) => !repo.fork || repos.length <= 3)
      .slice(0, 15)
      .map((repo: any) => {
        // Collect languages & topics into techStack
        const rawTech: string[] = [];
        if (repo.language) {
          rawTech.push(repo.language);
        }
        if (Array.isArray(repo.topics)) {
          rawTech.push(...repo.topics);
        }

        // Deduplicate and clean tech stack tags
        const techStack = Array.from(
          new Set(
            rawTech
              .map((t) => String(t).trim())
              .filter((t) => t.length > 0 && t.length < 30),
          ),
        );

        const title = repo.name
          ? String(repo.name).replace(/[-_]+/g, " ")
          : "Untitled Project";

        const description =
          repo.description?.trim() ||
          `Open source software repository showcasing ${repo.language || "development"} architecture and engineering.`;

        const liveDemoUrl =
          repo.homepage && repo.homepage.startsWith("http")
            ? repo.homepage.trim()
            : null;

        return {
          id: `gh_${repo.id}`,
          title: title.charAt(0).toUpperCase() + title.slice(1),
          description,
          techStack: techStack.length > 0 ? techStack : ["Software Engineering"],
          liveDemoUrl,
          repoUrl: repo.html_url || `https://github.com/${clean}/${repo.name}`,
          isImportedFromGithub: true,
        };
      });
  } catch (error) {
    console.error("Failed to fetch GitHub repos:", error);
    return [];
  }
}
