import type { CaredeskRole } from "../../../../packages/domain/src";

export type RuntimeRole = CaredeskRole | "invalid";

export interface UserRecord {
  id: string;
  name: string;
  email?: string;
  role: RuntimeRole;
  branchId: string;
  organizationId: string;
}
