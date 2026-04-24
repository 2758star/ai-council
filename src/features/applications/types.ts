export type ProjectStatus = "待准备" | "申请中" | "已提交" | "等结果" | "完成" | "追踪中" | "已放弃";
export type ProjectPriority = "高" | "中" | "低";

export type Project = {
  id: number;
  schoolName: string;
  programName: string;
  country: string | null;
  degreeType: string | null;
  intakeTerm: string | null;
  applicationRound: string | null;
  deadline: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  officialUrl: string | null;
  chineseName?: string | null;
  countryColor?: string | null;
  requirementUrl: string | null;
  essayUrl: string | null;
  recommendationUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SchoolProfile = {
  id: number;
  schoolName: string;
  country: string | null;
  officialUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDocumentStatus = "草稿" | "定稿" | "归档";

export type ProjectDocument = {
  id: number;
  projectId: number;
  requirementId: number | null;
  documentType: string;
  title: string;
  versionLabel: string;
  filePath: string | null;
  status: ProjectDocumentStatus | string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewProjectDocumentInput = {
  projectId: number;
  requirementId: number | null;
  documentType: string;
  title: string;
  versionLabel: string;
  filePath: string | null;
  status: ProjectDocumentStatus | string;
  notes: string | null;
};

export type NewProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt">;
export type UpdateProjectInput = Omit<Project, "createdAt" | "updatedAt">;

export type RequirementStatus = "未开始" | "进行中" | "已完成";
export type RequirementType = "文书" | "推荐信" | "成绩" | "作品集" | "其他";

export type ProjectRequirement = {
  id: number;
  projectId: number;
  requirementType: RequirementType | string;
  title: string;
  description: string | null;
  status: RequirementStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewRequirementInput = {
  projectId: number;
  requirementType: RequirementType | string;
  title: string;
  description: string | null;
  status: RequirementStatus;
  dueDate: string | null;
};

export type UpdateRequirementInput = {
  id: number;
  requirementType: RequirementType | string;
  title: string;
  description: string | null;
  status: RequirementStatus;
  dueDate: string | null;
};

export type RecommendationLetterStatus =
  | "未请求"
  | "已请求"
  | "跟进中"
  | "已提交"
  | "已完成"
  | "已拒绝"
  | string;

export type RecommendationLetter = {
  id: number;
  projectId: number;
  recommenderName: string;
  recommenderEmail: string | null;
  relationship: string | null;
  status: RecommendationLetterStatus;
  requestedAt: string | null;
  dueDate: string | null;
  submittedAt: string | null;
  lastFollowupAt: string | null;
  portalLink: string | null;
  linkedTaskId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewRecommendationLetterInput = Omit<
  RecommendationLetter,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateRecommendationLetterInput = Omit<
  RecommendationLetter,
  "createdAt" | "updatedAt"
>;
