import { create } from "zustand";

type ReviewMode = "exam" | "review";

type QuestionBankStore = {
  activeBankId: number | null;
  activeBankName: string | null;
  activePassageId: number | null;
  reviewMode: ReviewMode;
  setActiveBankId: (id: number | null) => void;
  setActiveBankName: (name: string | null) => void;
  setActivePassageId: (id: number | null) => void;
  setReviewMode: (mode: ReviewMode) => void;
};

export const useQuestionBankStore = create<QuestionBankStore>((set) => ({
  activeBankId: null,
  activeBankName: null,
  activePassageId: null,
  reviewMode: "exam",
  setActiveBankId: (activeBankId) => set({ activeBankId }),
  setActiveBankName: (activeBankName) => set({ activeBankName }),
  setActivePassageId: (activePassageId) => set({ activePassageId }),
  setReviewMode: (reviewMode) => set({ reviewMode }),
}));
