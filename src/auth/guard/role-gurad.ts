import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard'; // Import the JwtAuthGuard
import { Reflector } from '@nestjs/core'; // Reflector to retrieve metadata (role) from the route handler
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/users/users.service';

@Injectable()
export class RolesGuard extends JwtAuthGuard {
  constructor(
    private readonly reflector: Reflector, // Inject Reflector to get roles from metadata
    jwtService: JwtService, // Inject JwtService
    userService: UserService, // Inject UserService
  ) {
    super(jwtService, userService); // Pass the dependencies to the parent (JwtAuthGuard)
  }

  // Override the canActivate method to check for roles
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the roles from the route metadata
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    // console.log(context);
    if (!roles) {
      return true; // If no roles are specified, proceed with the request
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Get the authenticated user from the request
    // Check if the user has one of the required roles
    console.log(roles)
    const hasRole = roles.some((role) => user.role?.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('You do not have the required role !'); // If the user doesn't have the role, throw ForbiddenException
    }
    return true; // If the user has the required role, proceed with the request
  }
}
