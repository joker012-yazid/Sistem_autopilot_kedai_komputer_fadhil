import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { CaredeskModule } from "./caredesk/caredesk.module";
import { DatabaseModule } from "./database/database.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 900000,
        limit: 100
      },
      {
        name: "auth",
        ttl: 900000,
        limit: 5
      }
    ]),
    DatabaseModule,
    CaredeskModule
  ]
})
export class AppModule {}