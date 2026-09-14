"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketRegistry = void 0;
const common_1 = require("@nestjs/common");
let SocketRegistry = class SocketRegistry {
    byUser = new Map();
    bySocket = new Map();
    register(userId, socket) {
        this.bySocket.set(socket.id, userId);
        let set = this.byUser.get(userId);
        if (!set) {
            set = new Set();
            this.byUser.set(userId, set);
        }
        set.add(socket);
    }
    unregister(socket) {
        const userId = this.bySocket.get(socket.id);
        if (userId) {
            const set = this.byUser.get(userId);
            set?.delete(socket);
            if (set && set.size === 0)
                this.byUser.delete(userId);
        }
        this.bySocket.delete(socket.id);
    }
    isOnline(userId) {
        const set = this.byUser.get(userId);
        return !!set && set.size > 0;
    }
    emitToUser(userId, event, data) {
        const set = this.byUser.get(userId);
        set?.forEach((s) => s.emit(event, data));
    }
};
exports.SocketRegistry = SocketRegistry;
exports.SocketRegistry = SocketRegistry = __decorate([
    (0, common_1.Injectable)()
], SocketRegistry);
