import { ForbiddenException, Injectable } from "@nestjs/common";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export interface CaredeskStoredFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface CaredeskStorageAdapter {
  save(storageFolderPath: string, storedFilename: string, file: CaredeskStoredFile): Promise<string>;
  delete(storagePath: string): Promise<void>;
  read(storagePath: string): Promise<Buffer>;
}

@Injectable()
export class CaredeskNasStorageAdapter implements CaredeskStorageAdapter {
  async save(storageFolderPath: string, storedFilename: string, file: CaredeskStoredFile): Promise<string> {
    const localFolder = path.join(process.cwd(), ".data", "caredesk-nas", storageFolderPath.replace(/^\/caredesk\/?/, ""));
    await mkdir(localFolder, { recursive: true });
    await writeFile(path.join(localFolder, storedFilename), file.buffer);
    return `${storageFolderPath}/${storedFilename}`;
  }

  async delete(storagePath: string): Promise<void> {
    const root = path.resolve(process.cwd(), ".data", "caredesk-nas");
    const target = path.resolve(root, storagePath.replace(/^\/caredesk\/?/, ""));
    if (!target.startsWith(root)) {
      return;
    }
    await rm(target, { force: true });
  }

  async read(storagePath: string): Promise<Buffer> {
    const root = path.resolve(process.cwd(), ".data", "caredesk-nas");
    const target = path.resolve(root, storagePath.replace(/^\/caredesk\/?/, ""));
    if (!target.startsWith(root)) {
      throw new ForbiddenException("Invalid storage path");
    }
    return readFile(target);
  }
}