export interface GithubProfile {
  login: string;
  avatarUrl: string;
}

export interface LocalFile {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  content?: string;
}

export interface BaseRepository {
  id: number | string;
  name: string;
  description?: string;
  private: boolean;
  defaultBranch: string;
  language?: string;
  stargazersCount: number;
  watchersCount: number;
  forksCount: number;
  openIssuesCount: number;
  visibility: 'public' | 'private' | 'internal';
  migrationStatus:
    | 'PENDING'
    | 'ANALYZING'
    | 'READY'
    | 'MIGRATING'
    | 'COMPLETED';
  migrationEligible?: boolean;
  totalFiles?: number;
  affectedFiles?: number;
  technologies?: string[];
}

export interface Repository extends BaseRepository {
  htmlUrl: string;
  fullName: string;
  size: number;
}

export interface LocalRepository extends BaseRepository {
  files: LocalFile[];
  createdAt: Date;
}

export interface RepositoriesResponse {
  githubRepos: Repository[];
  localRepos: LocalRepository[];
}

export interface ExtendedRepository extends BaseRepository {
  technologies?: string[];
  migrationEligible: boolean;
  totalFiles?: number;
  affectedFiles?: number;
  htmlUrl: string;
  fullName: string;
}
