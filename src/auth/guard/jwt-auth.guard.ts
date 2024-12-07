import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/users/users.service';

@Injectable()
export class JwtAuthGuard {
  constructor(
    private readonly jwtService: JwtService, // Inject JwtService
    private readonly userService: UserService, // Inject UserService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('You are not authorized to access this resource!');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.userService.findOne(payload.id);

      if (payload.id !== user._id.toString()) {
        throw new UnauthorizedException('You are not authorized to access this resource!');
      }

      request.user = payload; // Attach user data to the request
      return true;
    } catch (error) {
      throw new UnauthorizedException('You are not authorized to access this resource!');
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const bearerToken = request.headers['authorization'];
    if (bearerToken && bearerToken.startsWith('Bearer ')) {
      return bearerToken.split(' ')[1];
    }
    return null;
  }
}
