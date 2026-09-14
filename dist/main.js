"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const ws_adapter_1 = require("./ws.adapter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        cors: {
            origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
            credentials: true,
        },
    });
    app.useWebSocketAdapter(new ws_adapter_1.WsAuthAdapter(app));
    const port = Number(process.env.PORT) || 3001;
    await app.listen(port);
    console.log(`CodeSpan API listening on ws://localhost:${port}`);
}
bootstrap();
