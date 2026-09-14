import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class SocketRegistry {
  private byUser = new Map<string, Set<Socket>>();
  private bySocket = new Map<string, string>();

  register(userId: string, socket: Socket) {
    this.bySocket.set(socket.id, userId);
    let set = this.byUser.get(userId);
    if (!set) {
      set = new Set();
      this.byUser.set(userId, set);
    }
    set.add(socket);
  }

  unregister(socket: Socket) {
    const userId = this.bySocket.get(socket.id);
    if (userId) {
      const set = this.byUser.get(userId);
      set?.delete(socket);
      if (set && set.size === 0) this.byUser.delete(userId);
    }
    this.bySocket.delete(socket.id);
  }

  isOnline(userId: string): boolean {
    const set = this.byUser.get(userId);
    return !!set && set.size > 0;
  }

  emitToUser<T>(userId: string, event: string, data: T) {
    const set = this.byUser.get(userId);
    set?.forEach((s) => s.emit(event, data));
  }
}