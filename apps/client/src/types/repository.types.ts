export interface GithubProfile {
  login: string;
  avatarUrl: string;
}

export interface Repository {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  description?: string;
  homepage?: string;
  language?: string;
  visibility: 'public' | 'private' | 'internal';
  size: number;
  hasIssues: boolean;
  hasProjects: boolean;
  hasWiki: boolean;
  archived: boolean;
  disabled: boolean;
  fork: boolean;
  htmlUrl: string;
  gitUrl?: string;
  sshUrl?: string;
  cloneUrl?: string;
  lastSynced?: string;
  technologies: string[];
  analyzedAt?: string;
  migrationEligible: boolean;
  migrationStatus:
    | 'PENDING'
    | 'ANALYZING'
    | 'READY'
    | 'MIGRATING'
    | 'COMPLETED';
  stargazersCount: number;
  watchersCount: number;
  forksCount: number;
  openIssuesCount: number;
  totalFiles?: number;
  totalLines?: number;
  affectedFiles?: number;
  createdAt: string;
  updatedAt: string;
  githubProfile: GithubProfile;
}
