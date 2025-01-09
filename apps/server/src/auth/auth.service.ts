import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RepositoryInterface } from '../../typesInterface/index';
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

      // Get user data using GitHub API directly
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

      const userRepositoryResponse = await fetch(
        'https://api.github.com/user/repos',
        {
          headers: {
            Authorization: `token ${tokenData.access_token}`,
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

      const userRepository: RepositoryInterface =
        await userRepositoryResponse.json();

      // this.logger.log(userRepository);
      this.storeUserRepositories(githubUser.id.toString(), userRepository);

      // Use email from user profile or generate one
      const userEmail = githubUser.email || `${githubUser.id}@github.user`;

      // db transaction, updating or creating the user for the multiple cases
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
        return { user, token };
      });

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

  async storeUserRepositories(
    githubUserId: string,
    userRepository: RepositoryInterface
  ) {
    try {
      // find the local user record via their GitHub ID or another unique field
      const user = await this.prisma.user.findUnique({
        where: { githubId: githubUserId },
      });
      if (!user) {
        throw new HttpException('User not found', 404);
      }

      // for each repo in userRepository, upsert into "Repository" table
      const upserts = userRepository.map((repo) => {
        return this.prisma.repository.upsert({
          where: {
            userId_fullName: {
              userId: user.id,
              fullName: repo.full_name,
            },
          },
          update: {
            private: repo.private,
            defaultBranch: repo.default_branch,
            description: repo.description,
            homepage: typeof repo.homepage === 'string' ? repo.homepage : '',
            language: repo.language ?? '',
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
            userId: user.id,
            name: repo.name,
            fullName: repo.full_name,
            private: repo.private,
            defaultBranch: repo.default_branch,
            description: repo.description,
            homepage: typeof repo.homepage === 'string' ? repo.homepage : '',
            language: repo.language ?? '',
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

      // all upsert operations in a transaction
      await this.prisma.$transaction(upserts);

      // return the updated list
      return { message: 'Repositories stored successfully' };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Failed to store repositories'
      );
    }
  }
}
