import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
// makes dealing w github api's ez
import { Octokit } from '@octokit/rest';
const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

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
      const { access_token, scope } = await token_response.json();
      if (!access_token) {
        throw new HttpException('Failed to get access token', 400);
      }
      // init octokit
      const octokit = new Octokit({ auth: access_token });

      // gets user data and emails
      const [{ data: githubUser }, { data: emails }] = await Promise.all([
        octokit.rest.users.getAuthenticated(),
        octokit.rest.users.listEmailsForAuthenticatedUser(),
      ]);

      const primaryEmail = emails.find((email) => email.primary)?.email;

      if (!primaryEmail) {
        throw new HttpException('No primary email found', 400);
      }

      // db transaction, updating or creating the user for the multiple cases
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.upsert({
          // creating or updating the local app user
          where: { githubId: githubUser.id },
          update: {
            email: primaryEmail,
            username: githubUser.login,
            updatedAt: new Date(),
          },
          create: {
            email: primaryEmail,
            username: githubUser.login,
            githubId: githubUser.id,
          },
        });
        // updating or creating gh token
        await tx.githubToken.upsert({
          where: { userId: user.id },
          update: {
            accessToken: access_token,
            scopes: scope.split(','),
            updatedAt: new Date(),
          },
          create: {
            userId: user.id,
            accessToken: access_token,
            scopes: scope.split(','),
          },
        });
        // logging history
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'auth.github.login',
            resource: user.id,
            metadata: {
              scopes: scope.split(','),
              timestamp: new Date().toISOString(),
            },
          },
        });

        const payload = {
          id: user.id,
          email: user.email,
          username: user.username,
        };

        // creating jwt token for the github logging
        const token = this.signToken(payload);
        return { user, token };
      });

      return {
        user: {
          email: result.user.email,
          username: result.user.username,
        },
        access_token: result.token,
      };
    } catch (error) {
      const FRONTEND_ORIGIN = this.configService.get<string>('FRONTEND_ORIGIN');
      return {
        redirectUrl: `${FRONTEND_ORIGIN}/auth/error?message=${encodeURIComponent(
          error.message
        )}`,
      };
    }
  }
}
