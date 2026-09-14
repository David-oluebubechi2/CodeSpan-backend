import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAuthAdapter } from './ws.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://codespan-tau.vercel.app'],
      credentials: true,
    },
  });
  app.useWebSocketAdapter(new WsAuthAdapter(app));
  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
  console.log(`CodeSpan API listening on ws://localhost:${port}`);
}
bootstrap();