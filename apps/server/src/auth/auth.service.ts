import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  private readonly logger = new Logger(AuthController.name);
  async register(registerDto: RegisterDto) {
    try {
      // checking if the user exists already
      const user = await prisma.user.findUnique({
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
      const newUser = await prisma.user.create({
        data: {
          email: registerDto.email,
          username: registerDto.username,
          password: hashedPassword,
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
      // checking if user exist
      const user = await prisma.user.findUnique({
        where: {
          email: loginDto.email,
        },
      });
      // if doesn't throw an err
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      // verifying the password
      const pwMatches = await argon2.verify(user.password, loginDto.password);
      // if not matches throw err
      if (!pwMatches) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // generating JWT access token
      const access_token = await this.signToken({
        id: user.id,
        email: user.email,
        username: user.username,
      });

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

      // Use email from user profile or generate one
      const userEmail = githubUser.email || `${githubUser.id}@github.user`;

      // db transaction, updating or creating the user for the multiple cases
      const result = await prisma.$transaction(async (tx) => {
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

        // Add await here
        const token = await this.signToken(payload);
        return { user, token };
      });

      const redirectUrl = `${this.configService.get<string>(
        'FRONTEND_ORIGIN'
      )}/auth/callback?token=${await result.token}&email=${encodeURIComponent(
        result.user.email
      )}&username=${encodeURIComponent(result.user.username)}`;

      // Return both redirect URL and perform redirect
      return {
        success: true,
        redirectUrl,
        user: {
          email: result.user.email,
          username: result.user.username,
        },
        access_token: await result.token,
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
}
