import { UserRole } from './enum';

export class JWTUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
}
