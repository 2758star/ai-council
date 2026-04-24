import { invoke } from "@tauri-apps/api/core";
import type {
  NewProjectDocumentInput,
  NewProjectInput,
  NewRecommendationLetterInput,
  NewRequirementInput,
  ProjectDocument,
  Project,
  ProjectRequirement,
  RecommendationLetter,
  SchoolProfile,
  UpdateRecommendationLetterInput,
  UpdateProjectInput,
  UpdateRequirementInput,
} from "@/features/applications/types";

export async function listProjects() {
  return invoke<Project[]>("list_projects");
}

export async function listSchoolProfiles() {
  return invoke<SchoolProfile[]>("list_school_profiles");
}

export async function createProject(payload: NewProjectInput) {
  return invoke<number>("create_project", { payload });
}

export async function updateProject(payload: UpdateProjectInput) {
  return invoke<void>("update_project", { payload });
}

export async function deleteProject(projectId: number) {
  return invoke<void>("delete_project", { projectId });
}

export async function listProjectRequirements(projectId: number) {
  return invoke<ProjectRequirement[]>("list_project_requirements", { projectId });
}

export async function createProjectRequirement(payload: NewRequirementInput) {
  return invoke<number>("create_project_requirement", { payload });
}

export async function updateProjectRequirement(payload: UpdateRequirementInput) {
  return invoke<void>("update_project_requirement", { payload });
}

export async function deleteProjectRequirement(requirementId: number) {
  return invoke<void>("delete_project_requirement", { requirementId });
}

export async function listProjectDocuments(projectId: number) {
  return invoke<ProjectDocument[]>("list_project_documents", { projectId });
}

export async function createProjectDocument(payload: NewProjectDocumentInput) {
  return invoke<number>("create_project_document", { payload });
}

export async function deleteProjectDocument(documentId: number) {
  return invoke<void>("delete_project_document", { documentId });
}

export async function listRecommendationLetters(projectId: number) {
  return invoke<RecommendationLetter[]>("list_recommendation_letters", { projectId });
}

export async function createRecommendationLetter(payload: NewRecommendationLetterInput) {
  return invoke<number>("create_recommendation_letter", { payload });
}

export async function updateRecommendationLetter(payload: UpdateRecommendationLetterInput) {
  return invoke<void>("update_recommendation_letter", { payload });
}

export async function deleteRecommendationLetter(letterId: number) {
  return invoke<void>("delete_recommendation_letter", { letterId });
}

export async function seedApplicationDemoData() {
  return invoke<void>("seed_application_demo_data");
}
