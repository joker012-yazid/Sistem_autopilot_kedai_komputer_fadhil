import { Injectable } from "@nestjs/common";
import { EventEmitter } from "node:events";

type DisplayListener = (revision: number) => void;

@Injectable()
export class CaredeskDisplayEventsService {
  private readonly emitter = new EventEmitter();
  private revision = 0;

  currentRevision() {
    return this.revision;
  }

  publishRefresh() {
    this.revision += 1;
    this.emitter.emit("snapshot", this.revision);
    return this.revision;
  }

  subscribe(listener: DisplayListener) {
    this.emitter.on("snapshot", listener);
    return () => {
      this.emitter.off("snapshot", listener);
    };
  }
}
