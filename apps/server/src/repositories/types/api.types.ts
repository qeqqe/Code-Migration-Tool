import { RepositoryDto } from './repository.types';
import { GitHubContentBase } from '../../../typesInterface';

export interface RepoContent extends GitHubContentBase {
  content?: string;
  download_url: string | null;
}

export interface RepoContentResponse {
  repository: RepositoryDto;
  contents: RepoContent[];
  currentContent?: {
    content: string;
    path: string;
    type: 'file' | 'dir';
  };
}
