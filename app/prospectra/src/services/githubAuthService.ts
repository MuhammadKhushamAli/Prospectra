export interface GitHubConnectResult {
  success: boolean;
  githubUrl?: string;
  username?: string;
  error?: string;
}

/**
 * Fetch public GitHub profile by username using GitHub public REST API.
 * Validates existence and returns verified canonical profile URL.
 */
export async function fetchGitHubProfileByUsername(
  username: string,
): Promise<GitHubConnectResult> {
  const cleanUsername = username.trim().replace(/^@/, "");
  if (!cleanUsername) {
    return {
      success: false,
      error: "Enter a valid GitHub username.",
    };
  }

  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (res.status === 200) {
      const data = await res.json();
      return {
        success: true,
        githubUrl: data.html_url || `https://github.com/${data.login}`,
        username: data.login,
      };
    } else if (res.status === 404) {
      return {
        success: false,
        error: `GitHub user "${cleanUsername}" was not found.`,
      };
    } else {
      return {
        success: false,
        error: `GitHub API error (${res.status}). You can enter your URL manually.`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to reach GitHub. Please enter your profile URL manually.",
    };
  }
}
