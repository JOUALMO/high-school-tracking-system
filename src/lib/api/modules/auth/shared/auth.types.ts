export interface AdminRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "admin";
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord {
  id: string;
  username: string;
  phone: string;
  passwordHash: string;
  selectedCurriculumId: string | null;
  role: "user";
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    role: "admin" | "user";
    name?: string;
    username?: string;
    email?: string;
    phone?: string;
    selectedCurriculumId?: string | null;
  };
}
