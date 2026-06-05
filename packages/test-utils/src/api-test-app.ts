import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "../../../apps/api/src/app.module";

export async function createApiTestApp(): Promise<{ app: INestApplication }> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleRef.createNestApplication();
  app.enableCors();
  await app.init();

  return { app };
}
