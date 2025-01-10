export interface GithubProfileDto {
  login: string;
  avatarUrl: string;
}

export interface RepositoryDto {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  description?: string | null;
  homepage?: string | null;
  language?: string | null;
  visibility: 'public' | 'private' | 'internal';
  size: number;
  hasIssues: boolean;
  hasProjects: boolean;
  hasWiki: boolean;
  archived: boolean;
  disabled: boolean;
  fork: boolean;
  htmlUrl: string;
  gitUrl?: string | null;
  sshUrl?: string | null;
  cloneUrl?: string | null;
  lastSynced?: Date | null;
  technologies: string[];
  analyzedAt?: Date | null;
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
  totalFiles?: number | null;
  totalLines?: number | null;
  affectedFiles?: number | null;
  createdAt: Date;
  updatedAt: Date;
  githubProfile: GithubProfileDto;
  githubProfileId: string;
  webhookId?: number | null;
  webhookSecret?: string | null;
}
