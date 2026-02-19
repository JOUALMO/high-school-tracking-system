import { apiRequest } from "@/lib/auth-client";

export interface AdminOverviewResponse {
  metrics: {
    users: number;
    curricula: number;
    publishedCurricula: number;
    drafts: number;
  };
  latestUsers: Array<{
    id: string;
    username: string;
    phone: string;
    selectedCurriculumId: string | null;
    createdAt: string;
  }>;
  latestCurricula: Array<{
    id: string;
    title: string;
    status: "draft" | "published";
    activeVersion: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface AdminUsersResponse {
  items: Array<{
    id: string;
    username: string;
    phone: string;
    selectedCurriculumId: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface AdminCurriculaResponse {
  items: Array<{
    id: string;
    title: string;
    status: "draft" | "published";
    activeVersion: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface AdminCurriculumDetailsResponse {
  item: AdminCurriculaResponse["items"][number];
  activeVersion: {
    id: string;
    curriculumId: string;
    version: number;
    title: string;
    data: unknown;
    createdBy: string;
    createdAt: string;
  };
  versions: Array<{
    id: string;
    curriculumId: string;
    version: number;
    title: string;
    createdBy: string;
    createdAt: string;
  }>;
}

export function getAdminOverview() {
  return apiRequest<AdminOverviewResponse>("/admin/overview");
}

export function getAdminUsers() {
  return apiRequest<AdminUsersResponse>("/admin/users");
}

export function getAdminCurricula() {
  return apiRequest<AdminCurriculaResponse>("/admin/curricula");
}

export function getAdminCurriculum(curriculumId: string) {
  return apiRequest<AdminCurriculumDetailsResponse>(`/admin/curricula/${curriculumId}`);
}

export function createAdminCurriculum(payload: { title: string; data: unknown }) {
  return apiRequest<{ item: AdminCurriculaResponse["items"][number] }>(
    "/admin/curricula",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateAdminCurriculumStatus(
  curriculumId: string,
  status: "draft" | "published",
) {
  return apiRequest<{ item: AdminCurriculaResponse["items"][number] }>(
    `/admin/curricula/${curriculumId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export function updateAdminCurriculum(
  curriculumId: string,
  payload: { title: string; data: unknown },
) {
  return apiRequest<{ item: AdminCurriculaResponse["items"][number] }>(
    `/admin/curricula/${curriculumId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteAdminCurriculum(curriculumId: string) {
  return apiRequest<{ ok: boolean }>(`/admin/curricula/${curriculumId}`, {
    method: "DELETE",
  });
}
