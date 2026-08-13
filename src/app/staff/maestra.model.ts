export interface TeacherResponse {
  idDocumentFirebase?: string;
  branchId?: string;
  id?: string;
  name?: string;
  phone?: string;
  email?: string | null;
  birthDate?: string | null;
  hireDate?: string | null;
  colorHex?: string;
  photoUrl?: string | null;
  description?: string | null;
  skills?: string[];
}

export interface GetTeacherByBranchResponse {
  success: boolean;
  branchId: string;
  total: number;
  teachers: TeacherResponse[];
}
export interface GetTeacherByBranchRequest {
  branchId: string;
}
