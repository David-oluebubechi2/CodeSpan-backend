"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsAuthAdapter = void 0;
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const jsonwebtoken_1 = require("jsonwebtoken");
class WsAuthAdapter extends platform_socket_io_1.IoAdapter {
    createIOServer(port, options) {
        const server = super.createIOServer(port, options);
        server.use((socket, next) => {
            const token = socket.handshake.auth?.token;
            if (typeof token === 'string' && token.length > 0) {
                try {
                    const payload = (0, jsonwebtoken_1.verify)(token, process.env.JWT_SECRET || 'codespan-dev-secret-change-in-prod');
                    socket.data.userId = payload.sub;
                    socket.data.role = payload.role;
                }
                catch {
                    socket.emit('auth', { ok: false, error: 'Invalid session' });
                }
            }
            next();
        });
        return server;
    }
}
exports.WsAuthAdapter = WsAuthAdapter;
