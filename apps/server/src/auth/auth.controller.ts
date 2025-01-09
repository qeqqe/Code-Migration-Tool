import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { JwtAuthGuard } from './strategy/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    username: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {}
  @Get()
  test() {
    return { message: 'Hello world' };
  }
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('github')
  github() {
    return this.authService.github();
  }

  @Get('github/callback')
  async githubCallback(@Query('code') code: string, @Res() res: Response) {
    try {
      const result = await this.authService.githubCallback(code);

      if (result.success) {
        return res.redirect(result.redirectUrl);
      } else {
        // error URL log
        console.log('Redirecting to error URL:', result.redirectUrl);
        return res.redirect(result.redirectUrl);
      }
    } catch (error) {
      console.error('GitHub callback error:', error);
      const errorUrl = `${this.configService.get<string>(
        'FRONTEND_ORIGIN'
      )}/auth/error?message=Authentication failed`;
      return res.redirect(errorUrl);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        githubProfile: true,
      },
    });
    return user;
  }
}
