import { Repository } from './repository.types';

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

export interface RepoContent extends GitHubContentBase {
  content?: string;
  download_url: string | null;
}

export interface RepoContentResponse {
  repository: Repository;
  contents: RepoContent[];
  currentContent?: {
    content: string;
    path: string;
    type: 'file' | 'dir';
  };
}
