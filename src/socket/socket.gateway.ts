import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocketService } from './socket.service';

@WebSocketGateway()
export class SocketGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly socketService: SocketService) {}

  handleConnection(socket: Socket): void {
    this.socketService.handleConnection(socket);
  }

}