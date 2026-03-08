const fallbackRepoSlug = "bozliu/politiclear-v2";

export const projectRepoSlug =
  process.env.EXPO_PUBLIC_POLITICLEAR_GITHUB_REPO || fallbackRepoSlug;

export const projectRepositoryUrl = `https://github.com/${projectRepoSlug}`;
export const projectIssuesUrl = `${projectRepositoryUrl}/issues`;
export const projectIssuesNewUrl = `${projectIssuesUrl}/new/choose`;
