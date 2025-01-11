import { Repository as PrismaRepository } from '@prisma/client';

export interface GitHubContentBase {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  type: 'file' | 'dir';
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

export interface GitHubFile extends GitHubContentBase {
  type: 'file';
  download_url: string;
}

export interface GitHubDirectory extends GitHubContentBase {
  type: 'dir';
  download_url: null;
}

export type GitHubContent = GitHubFile | GitHubDirectory;

export interface GitHubRepoResponse {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  owner: Owner;
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  homepage: string | null;
  language: string | null;
  forks_url: string;
  keys_url: string;
  collaborators_url: string;
  teams_url: string;
  hooks_url: string;
  issue_events_url: string;
  events_url: string;
  assignees_url: string;
  branches_url: string;
  tags_url: string;
  blobs_url: string;
  git_tags_url: string;
  git_refs_url: string;
  trees_url: string;
  statuses_url: string;
  languages_url: string;
  stargazers_url: string;
  contributors_url: string;
  subscribers_url: string;
  subscription_url: string;
  commits_url: string;
  git_commits_url: string;
  comments_url: string;
  issue_comment_url: string;
  contents_url: string;
  compare_url: string;
  merges_url: string;
  archive_url: string;
  downloads_url: string;
  issues_url: string;
  pulls_url: string;
  milestones_url: string;
  notifications_url: string;
  labels_url: string;
  releases_url: string;
  deployments_url: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  git_url: string;
  ssh_url: string;
  clone_url: string;
  svn_url: string;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  has_issues: boolean;
  has_projects: boolean;
  has_downloads: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  has_discussions: boolean;
  forks_count: number;
  archived: boolean;
  disabled: boolean;
  open_issues_count: number;
  license: any;
  allow_forking: boolean;
  is_template: boolean;
  web_commit_signoff_required: boolean;
  topics: string[];
  visibility: string;
  forks: number;
  open_issues: number;
  watchers: number;
  default_branch: string;
  permissions: Permissions;
  mirror_url: string | null;
}

export type GithubRepositories = GitHubRepoResponse[];

export interface Owner {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
}

export interface Permissions {
  admin: boolean;
  maintain: boolean;
  push: boolean;
  triage: boolean;
  pull: boolean;
}

export interface RepoContent extends GitHubContentBase {
  content?: string;
  download_url: string | null;
}

export interface RepoContentResponse {
  repository: GitHubRepoResponse;
  contents: RepoContent[];
  currentContent?: {
    content: string;
    path: string;
    type: 'file' | 'dir';
  };
}

export type RepositoryTransform = {
  node_id: string;
  full_name: string;
  owner: {
    login: string;
    [key: string]: any;
  };
  html_url: string;
  [key: string]: any;
};

export function convertToGitHubResponse(
  repo: PrismaRepository
): GitHubRepoResponse {
  return {
    id: repo.id,
    node_id: '',
    name: repo.name,
    full_name: repo.fullName,
    private: repo.private,
    owner: {
      login: '',
      id: 0,
      node_id: '',
      avatar_url: '',
      gravatar_id: '',
      url: '',
      html_url: '',
      followers_url: '',
      following_url: '',
      gists_url: '',
      starred_url: '',
      subscriptions_url: '',
      organizations_url: '',
      repos_url: '',
      events_url: '',
      received_events_url: '',
      type: '',
      site_admin: false,
    },
    html_url: repo.htmlUrl,
    description: repo.description || '',
    fork: repo.fork,
    url: '',
    stargazers_count: repo.stargazersCount,
    watchers_count: repo.watchersCount,
    language: repo.language || '',
    has_issues: repo.hasIssues,
    has_projects: repo.hasProjects,
    forks_count: repo.forksCount,
    open_issues_count: repo.openIssuesCount,
    default_branch: repo.defaultBranch,
    visibility: repo.visibility,
  } as GitHubRepoResponse;
}
