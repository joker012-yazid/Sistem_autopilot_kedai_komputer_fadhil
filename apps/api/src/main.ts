import "reflect-metadata";
import "./load-env";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { getCaredeskAllowedOrigins } from "./auth/caredesk-origin";
import { PrismaService } from "./database/prisma.service";
import { ProductionExceptionFilter } from "./filters/production-exception.filter";

const isProduction = process.env.NODE_ENV === "production";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
    crossOriginEmbedderPolicy: isProduction ? undefined : false
  }));

  app.enableCors({
    origin: getCaredeskAllowedOrigins(),
    credentials: true
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: false }));
  app.useGlobalFilters(new ProductionExceptionFilter());

  app.getHttpAdapter().get("/health", async (_req, res) => {
    const prisma = app.get(PrismaService);
    let dbStatus = "ok";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "error";
    }
    res.json({
      status: dbStatus === "ok" ? "ok" : "degraded",
      database: dbStatus,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: isProduction ? "production" : "development"
    });
  });

  const port = Number(process.env.PORT) || 4000;
  const host = isProduction ? "0.0.0.0" : "127.0.0.1";
  await app.listen(port, host);
  console.log(`CareDesk API running on http://${host}:${port} (${isProduction ? "production" : "development"})`);
}

void bootstrap();
