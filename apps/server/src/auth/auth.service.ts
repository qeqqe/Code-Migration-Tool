import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Repository } from '@prisma/client';
import {
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GitHubRepoResponse, GithubRepositories } from '../../typesInterface';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  private readonly logger = new Logger(AuthService.name);
  async register(registerDto: RegisterDto) {
    try {
      // checking if the user exists already
      const user = await this.prisma.user.findUnique({
        where: {
          email: registerDto.email,
        },
      });
      // if it does throw a new conflict error
      if (user) {
        throw new ConflictException('User already exists');
      }

      // using argon for better and more secure hash then bcrypt
      const hashedPassword = await argon2.hash(registerDto.password);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const newUser = await this.prisma.user.create({
        data: {
          email: registerDto.email,
          username: registerDto.username,
          password: hashedPassword,
          authMethod: 'LOCAL',
        },
      });
      return {
        message: 'User created successfully',
      };
    } catch (error) {
      console.error('Registration error:', error);

      if (error instanceof ConflictException) {
        throw error;
      }

      if (error.code === 'P2002') {
        throw new ConflictException('Email or username already exists');
      }

      throw new InternalServerErrorException(
        'An error occurred while registering'
      );
    }
  }

  async login(loginDto: LoginDto) {
    try {
      // checking if the user exists
      const user = await this.prisma.user.findUnique({
        where: {
          email: loginDto.email,
        },
      });
      // if it doesn't throw an error
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      // check encrypted password
      const pwMatches = await argon2.verify(user.password, loginDto.password);
      if (!pwMatches) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload = {
        id: user.id,
        email: user.email,
        username: user.username,
      };

      const access_token = await this.signToken(payload);

      console.log('Generated token:', access_token);
      console.log('Token payload:', payload);

      return {
        message: 'Successfully logged in',
        access_token,
        user: { email: user.email, username: user.username },
      };
    } catch (error) {
      console.error('Login error:', error);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException('An error occurred during login');
    }
  }

  async signToken(payload: { id: string; email: string; username: string }) {
    try {
      const token = await this.jwtService.signAsync(payload, {
        expiresIn: '1d',
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      return token;
    } catch (error) {
      console.log(`New error ${error}`);
      throw new UnauthorizedException('Token generation failed');
    }
  }

  async github() {
    const GITHUB_CLIENT_ID = this.configService.get<string>('GITHUB_CLIENT_ID');
    const GITHUB_CALLBACK_URL = this.configService.get<string>(
      'GITHUB_CALLBACK_URL'
    );
    const redirect_url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_CALLBACK_URL}&scope=repo admin:repo_hook workflow
`;
    return { url: redirect_url };
  }

  /**
   * handles the GH OAuth callback. exchanges the code for an access token,
   * retrieves user data, updates or creates local records, and returns a
   * redirect URL if an error occurs.
   *
   * @param code - Auth code from GH OAuth.
   * @throws HttpException - If token retrieval fails or no primary email is found.
   */
  async githubCallback(code: string) {
    try {
      const GITHUB_CLIENT_SECRET = this.configService.get<string>(
        'GITHUB_CLIENT_SECRET'
      );
      const GITHUB_CLIENT_ID =
        this.configService.get<string>('GITHUB_CLIENT_ID');

      // Get access token
      const token_response = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code,
          }),
        }
      );

      const tokenData = await token_response.json();
      this.logger.debug('GitHub token response:', tokenData);

      if (!tokenData.access_token) {
        this.logger.error('No access token in response:', tokenData);
        throw new HttpException(
          tokenData.error_description || 'Failed to get access token',
          400
        );
      }

      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${tokenData.access_token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Code-Migration-Tool',
        },
      });

      if (!userResponse.ok) {
        this.logger.error('GitHub user response error:', {
          status: userResponse.status,
          statusText: userResponse.statusText,
          body: await userResponse.text(),
        });
        throw new HttpException(
          `GitHub API error: ${userResponse.statusText}`,
          userResponse.status
        );
      }

      const githubUser = await userResponse.json();

      this.logger.log(githubUser);

      const baseUrl = 'https://api.github.com/user/repos';
      let page = 1;
      const perPage = 100;
      let allRepos: GitHubRepoResponse[] = [];
      while (true) {
        const userRepositoryResponse = await fetch(
          `${baseUrl}?page=${page}&per_page=${perPage}`,
          {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'Code-Migration-Tool',
            },
          }
        );
        if (!userRepositoryResponse.ok) {
          this.logger.error('GitHub user response error:', {
            status: userRepositoryResponse.status,
            statusText: userRepositoryResponse.statusText,
            body: await userRepositoryResponse.text(),
          });
          throw new HttpException(
            `GitHub API error: ${userRepositoryResponse.statusText}`,
            userRepositoryResponse.status
          );
        }

        const repos: GitHubRepoResponse[] = await userRepositoryResponse.json();
        if (repos.length === 0) {
          break;
        }
        allRepos = [...allRepos, ...repos];
        if (repos.length < perPage) {
          break;
        }
        page++;
      }

      const userRepository: GitHubRepoResponse[] = allRepos;

      // use email from user profile or generate one
      const userEmail = githubUser.email || `${githubUser.id}@github.user`;

      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.upsert({
          // creating or updating the local app user
          where: { githubId: githubUser.id.toString() },
          update: {
            email: userEmail,
            username: githubUser.login,
            updatedAt: new Date(),
          },
          create: {
            email: userEmail,
            username: githubUser.login,
            githubId: githubUser.id.toString(),
            password: null, // explicitly set password as null for GitHub users
          },
        });

        // create/update GitHub profile and store the result
        const githubProfile = await tx.gitHubProfile.upsert({
          where: { githubId: githubUser.id }, // This should be a number
          update: {
            login: githubUser.login,
            nodeId: githubUser.node_id,
            avatarUrl: githubUser.avatar_url,
            gravatarId: githubUser.gravatar_id,
            url: githubUser.url,
            htmlUrl: githubUser.html_url,
            followersUrl: githubUser.followers_url,
            followingUrl: githubUser.following_url,
            gistsUrl: githubUser.gists_url,
            starredUrl: githubUser.starred_url,
            subscriptionsUrl: githubUser.subscriptions_url,
            organizationsUrl: githubUser.organizations_url,
            reposUrl: githubUser.repos_url,
            eventsUrl: githubUser.events_url,
            type: githubUser.type,
            userViewType: githubUser.user_view_type,
            siteAdmin: githubUser.site_admin,
            name: githubUser.name,
            company: githubUser.company,
            blog: githubUser.blog,
            location: githubUser.location,
            email: githubUser.email,
            hireable: githubUser.hireable,
            bio: githubUser.bio,
            twitterUsername: githubUser.twitter_username,
            publicRepos: githubUser.public_repos,
            publicGists: githubUser.public_gists,
            followers: githubUser.followers,
            following: githubUser.following,
            createdAt: new Date(githubUser.created_at),
            updatedAt: new Date(githubUser.updated_at),
          },
          create: {
            userId: user.id,
            login: githubUser.login,
            githubId: githubUser.id, // This should be a number
            nodeId: githubUser.node_id,
            avatarUrl: githubUser.avatar_url,
            gravatarId: githubUser.gravatar_id,
            url: githubUser.url,
            htmlUrl: githubUser.html_url,
            followersUrl: githubUser.followers_url,
            followingUrl: githubUser.following_url,
            gistsUrl: githubUser.gists_url,
            starredUrl: githubUser.starred_url,
            subscriptionsUrl: githubUser.subscriptions_url,
            organizationsUrl: githubUser.organizations_url,
            reposUrl: githubUser.repos_url,
            eventsUrl: githubUser.events_url,
            type: githubUser.type,
            userViewType: githubUser.user_view_type,
            siteAdmin: githubUser.site_admin,
            name: githubUser.name,
            company: githubUser.company,
            blog: githubUser.blog,
            location: githubUser.location,
            email: githubUser.email,
            hireable: githubUser.hireable,
            bio: githubUser.bio,
            twitterUsername: githubUser.twitter_username,
            publicRepos: githubUser.public_repos,
            publicGists: githubUser.public_gists,
            followers: githubUser.followers,
            following: githubUser.following,
            createdAt: new Date(githubUser.created_at),
            updatedAt: new Date(githubUser.updated_at),
          },
        });

        // updating or creating gh token
        await tx.githubToken.upsert({
          where: { userId: user.id },
          update: {
            accessToken: tokenData.access_token,
            scopes: tokenData.scope.split(','),
            updatedAt: new Date(),
          },
          create: {
            userId: user.id,
            accessToken: tokenData.access_token,
            scopes: tokenData.scope.split(','),
          },
        });
        // logging history
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'auth.github.login',
            resource: user.id,
            metadata: {
              scopes: tokenData.scope.split(','),
              timestamp: new Date().toISOString(),
            },
          },
        });

        const payload = {
          id: user.id,
          email: user.email,
          username: user.username,
        };

        const token = await this.signToken(payload);
        return { user, token, githubProfile };
      });

      // using the ghProfile from the transaction result
      await this.storeUserRepositories(result.githubProfile.id, userRepository);

      const redirectUrl = `${this.configService.get<string>(
        'FRONTEND_ORIGIN'
      )}/auth/callback?token=${await result.token}&email=${encodeURIComponent(
        result.user.email
      )}&username=${encodeURIComponent(result.user.username)}`;

      return {
        success: true,
        redirectUrl,
        user: {
          email: result.user.email,
          username: result.user.username,
        },
      };
    } catch (error) {
      this.logger.error('GitHub callback detailed error:', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
      });

      let errorMessage = 'Authentication failed';

      if (error instanceof HttpException) {
        errorMessage = error.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'GitHub authentication failed. Please try again.';
      } else if (error.message) {
        errorMessage = `GitHub error: ${error.message}`;
      }

      console.error('Detailed error:', {
        message: error.message,
        response: error.response,
        stack: error.stack,
      });

      return {
        success: false,
        redirectUrl: `${this.configService.get<string>(
          'FRONTEND_ORIGIN'
        )}/auth/error?message=${encodeURIComponent(errorMessage)}`,
      };
    }
  }

  // update storeUserRepositories to accept githubProfileId directly
  async storeUserRepositories(
    githubProfileId: string,
    userRepository: GithubRepositories
  ) {
    try {
      const upserts = userRepository.map((repo) => {
        return this.prisma.repository.upsert({
          where: {
            githubProfileId_fullName: {
              githubProfileId,
              fullName: repo.full_name,
            },
          },
          update: {
            name: repo.name,
            private: repo.private,
            defaultBranch: repo.default_branch,
            description: repo.description || '',
            homepage: repo.homepage || '',
            language: repo.language || '',
            visibility: repo.visibility,
            size: repo.size,
            hasIssues: repo.has_issues,
            hasProjects: repo.has_projects,
            hasWiki: repo.has_wiki,
            archived: repo.archived,
            disabled: repo.disabled,
            fork: repo.fork,
            htmlUrl: repo.html_url,
            gitUrl: repo.git_url,
            sshUrl: repo.ssh_url,
            cloneUrl: repo.clone_url,
            stargazersCount: repo.stargazers_count,
            watchersCount: repo.watchers_count,
            forksCount: repo.forks_count,
            openIssuesCount: repo.open_issues_count,
            lastSynced: new Date(),
            updatedAt: new Date(),
          },
          create: {
            githubProfileId,
            name: repo.name,
            fullName: repo.full_name,
            private: repo.private,
            defaultBranch: repo.default_branch,
            description: repo.description || '',
            homepage: repo.homepage || '',
            language: repo.language || '',
            visibility: repo.visibility,
            size: repo.size,
            hasIssues: repo.has_issues,
            hasProjects: repo.has_projects,
            hasWiki: repo.has_wiki,
            archived: repo.archived,
            disabled: repo.disabled,
            fork: repo.fork,
            htmlUrl: repo.html_url,
            gitUrl: repo.git_url,
            sshUrl: repo.ssh_url,
            cloneUrl: repo.clone_url,
            stargazersCount: repo.stargazers_count,
            watchersCount: repo.watchers_count,
            forksCount: repo.forks_count,
            openIssuesCount: repo.open_issues_count,
            lastSynced: new Date(),
          },
        });
      });

      await this.prisma.$transaction(upserts);
      return { message: 'Repositories stored successfully' };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Failed to store repositories'
      );
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        githubProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private transformGithubRepo(
    repo: Partial<GitHubRepoResponse> | Repository
  ): GitHubRepoResponse {
    const isGitHubRepo = 'node_id' in repo;
    const isPrismaRepo = 'createdAt' in repo && repo.createdAt instanceof Date;

    // Get dates with proper type checking
    const created = isPrismaRepo
      ? (repo as Repository).createdAt.toISOString()
      : isGitHubRepo && (repo as GitHubRepoResponse).created_at
      ? (repo as GitHubRepoResponse).created_at
      : new Date().toISOString();

    const updated = isPrismaRepo
      ? (repo as Repository).updatedAt.toISOString()
      : isGitHubRepo && (repo as GitHubRepoResponse).updated_at
      ? (repo as GitHubRepoResponse).updated_at
      : new Date().toISOString();

    return {
      id: repo.id,
      node_id: isGitHubRepo ? (repo as GitHubRepoResponse).node_id : '',
      name: repo.name,
      full_name: isGitHubRepo
        ? (repo as GitHubRepoResponse).full_name
        : (repo as Repository).fullName,
      private: repo.private,
      owner: isGitHubRepo
        ? (repo as GitHubRepoResponse).owner
        : {
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
      html_url: isGitHubRepo
        ? (repo as GitHubRepoResponse).html_url
        : (repo as Repository).htmlUrl,
      description: repo.description || '',
      fork: 'fork' in repo ? repo.fork : false,
      url: isGitHubRepo ? (repo as GitHubRepoResponse).url : '',
      // Add all required GitHubRepoResponse fields with proper type checking
      forks_url: '',
      keys_url: '',
      collaborators_url: '',
      teams_url: '',
      hooks_url: '',
      issue_events_url: '',
      events_url: '',
      assignees_url: '',
      branches_url: '',
      tags_url: '',
      blobs_url: '',
      git_tags_url: '',
      git_refs_url: '',
      trees_url: '',
      statuses_url: '',
      languages_url: '',
      stargazers_url: '',
      contributors_url: '',
      subscribers_url: '',
      subscription_url: '',
      commits_url: '',
      git_commits_url: '',
      comments_url: '',
      issue_comment_url: '',
      contents_url: '',
      compare_url: '',
      merges_url: '',
      archive_url: '',
      downloads_url: '',
      issues_url: '',
      pulls_url: '',
      milestones_url: '',
      notifications_url: '',
      labels_url: '',
      releases_url: '',
      deployments_url: '',
      created_at: created,
      updated_at: updated,
      pushed_at: '',
      git_url: 'gitUrl' in repo ? repo.gitUrl || '' : '',
      ssh_url: 'sshUrl' in repo ? repo.sshUrl || '' : '',
      clone_url: 'cloneUrl' in repo ? repo.cloneUrl || '' : '',
      svn_url: '',
      homepage: repo.homepage || '',
      size: repo.size || 0,
      stargazers_count: 'stargazersCount' in repo ? repo.stargazersCount : 0,
      watchers_count: 'watchersCount' in repo ? repo.watchersCount : 0,
      language: repo.language || '',
      has_issues: 'hasIssues' in repo ? repo.hasIssues : false,
      has_projects: 'hasProjects' in repo ? repo.hasProjects : false,
      has_downloads: true,
      has_wiki: 'hasWiki' in repo ? repo.hasWiki : false,
      has_pages: false,
      has_discussions: false,
      forks_count: 'forksCount' in repo ? repo.forksCount : 0,
      mirror_url: null,
      archived: 'archived' in repo ? repo.archived : false,
      disabled: 'disabled' in repo ? repo.disabled : false,
      open_issues_count: 'openIssuesCount' in repo ? repo.openIssuesCount : 0,
      license: null,
      allow_forking: true,
      is_template: false,
      web_commit_signoff_required: false,
      topics: [],
      visibility: 'visibility' in repo ? repo.visibility : 'public',
      forks: 'forksCount' in repo ? repo.forksCount : 0,
      open_issues: 'openIssuesCount' in repo ? repo.openIssuesCount : 0,
      watchers: 'watchersCount' in repo ? repo.watchersCount : 0,
      default_branch: 'defaultBranch' in repo ? repo.defaultBranch : 'main',
      permissions: {
        admin: true,
        maintain: true,
        push: true,
        triage: true,
        pull: true,
      },
    };
  }

  async syncUserRepositories(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        githubProfile: true,
        githubToken: true,
      },
    });

    if (!user || !user.githubToken) {
      throw new Error('User or GitHub token not found');
    }

    try {
      const existingRepos = await this.prisma.repository.findMany({
        where: { githubProfileId: user.githubProfile.id },
      });

      const transformedExistingRepos: GitHubRepoResponse[] = existingRepos.map(
        (repo) => ({
          id: repo.id,
          node_id: '', // default values for required GitHubRepoResponse fields
          name: repo.name,
          full_name: repo.fullName,
          private: repo.private,
          owner: {
            login: user.githubProfile.login,
            id: user.githubProfile.githubId,
            node_id: user.githubProfile.nodeId,
            avatar_url: user.githubProfile.avatarUrl,
            gravatar_id: user.githubProfile.gravatarId || '',
            url: user.githubProfile.url,
            html_url: user.githubProfile.htmlUrl,
            followers_url: user.githubProfile.followersUrl,
            following_url: user.githubProfile.followingUrl,
            gists_url: user.githubProfile.gistsUrl,
            starred_url: user.githubProfile.starredUrl,
            subscriptions_url: user.githubProfile.subscriptionsUrl,
            organizations_url: user.githubProfile.organizationsUrl,
            repos_url: user.githubProfile.reposUrl,
            events_url: user.githubProfile.eventsUrl,
            received_events_url: '',
            type: user.githubProfile.type,
            site_admin: user.githubProfile.siteAdmin,
          },
          html_url: repo.htmlUrl,
          description: repo.description || '',
          fork: repo.fork,
          url: '',
          forks_url: '',
          keys_url: '',
          collaborators_url: '',
          teams_url: '',
          hooks_url: '',
          issue_events_url: '',
          events_url: '',
          assignees_url: '',
          branches_url: '',
          tags_url: '',
          blobs_url: '',
          git_tags_url: '',
          git_refs_url: '',
          trees_url: '',
          statuses_url: '',
          languages_url: '',
          stargazers_url: '',
          contributors_url: '',
          subscribers_url: '',
          subscription_url: '',
          commits_url: '',
          git_commits_url: '',
          comments_url: '',
          issue_comment_url: '',
          contents_url: '',
          compare_url: '',
          merges_url: '',
          archive_url: '',
          downloads_url: '',
          issues_url: '',
          pulls_url: '',
          milestones_url: '',
          notifications_url: '',
          labels_url: '',
          releases_url: '',
          deployments_url: '',
          created_at: repo.createdAt.toISOString(),
          updated_at: repo.updatedAt.toISOString(),
          pushed_at: '',
          git_url: repo.gitUrl || '',
          ssh_url: repo.sshUrl || '',
          clone_url: repo.cloneUrl || '',
          svn_url: '',
          homepage: repo.homepage || '',
          size: repo.size,
          stargazers_count: repo.stargazersCount,
          watchers_count: repo.watchersCount,
          language: repo.language || '',
          has_issues: repo.hasIssues,
          has_projects: repo.hasProjects,
          has_downloads: true,
          has_wiki: repo.hasWiki,
          has_pages: false,
          has_discussions: false,
          forks_count: repo.forksCount,
          mirror_url: null,
          archived: repo.archived,
          disabled: repo.disabled,
          open_issues_count: repo.openIssuesCount,
          license: null,
          allow_forking: true,
          is_template: false,
          web_commit_signoff_required: false,
          topics: [],
          visibility: repo.visibility,
          forks: repo.forksCount,
          open_issues: repo.openIssuesCount,
          watchers: repo.watchersCount,
          default_branch: repo.defaultBranch,
          permissions: {
            admin: true,
            maintain: true,
            push: true,
            triage: true,
            pull: true,
          },
        })
      );

      // fetching new repos from GitHub
      const response = await fetch(
        `${this.configService.get('GITHUB_API_URL')}/user/repos`,
        {
          headers: {
            Authorization: `Bearer ${user.githubToken.accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch GitHub repositories');
      }

      const githubRepos: GitHubRepoResponse[] = await response.json();

      // combine and deduplicate repos
      const repoMap = new Map<string, GitHubRepoResponse>();

      // add GH repos first
      githubRepos.forEach((repo) => repoMap.set(repo.full_name, repo));

      // then add transformed repos, only if they don't exist
      transformedExistingRepos.forEach((repo) => {
        if (!repoMap.has(repo.full_name)) {
          repoMap.set(repo.full_name, repo);
        }
      });

      //convert the map back to array
      const allRepos: GitHubRepoResponse[] = Array.from(repoMap.values());

      // Store the synchronized repositories
      await this.storeUserRepositories(user.githubProfile.id, allRepos);

      // Update last synced timestamp for the profile
      await this.prisma.gitHubProfile.update({
        where: { id: user.githubProfile.id },
        data: { updatedAt: new Date() },
      });
    } catch (error) {
      this.logger.error('Failed to sync repositories:', {
        userId,
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof HttpException) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw new UnauthorizedException('GitHub token expired or invalid');
      }

      throw new InternalServerErrorException(
        error.message || 'Failed to synchronize repositories'
      );
    }

    this.logger.log(
      `Successfully synchronized repositories for user ${userId}`
    );
  }
}
