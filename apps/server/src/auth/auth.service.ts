import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

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
    } catch {
      throw new InternalServerErrorException(
        'An error occured while registering'
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
        throw new UnauthorizedException('User doesnt exist');
      }
      // verifying the password
      const pwMatches = await argon2.verify(loginDto.password, user.password);
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
    } catch {
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
}
