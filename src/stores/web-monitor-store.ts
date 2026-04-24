import { create } from "zustand";

type WebMonitorStore = {
  query: string;
  category: string;
  linkedProjectId: number | null;
  activeOnly: boolean;
  showAdvanced: boolean;
  setQuery: (query: string) => void;
  setCategory: (category: string) => void;
  setLinkedProjectId: (projectId: number | null) => void;
  setActiveOnly: (value: boolean) => void;
  setShowAdvanced: (value: boolean) => void;
  resetFilters: () => void;
};

export const useWebMonitorStore = create<WebMonitorStore>((set) => ({
  query: "",
  category: "all",
  linkedProjectId: null,
  activeOnly: false,
  showAdvanced: false,
  setQuery: (query) => set({ query }),
  setCategory: (category) => set({ category }),
  setLinkedProjectId: (linkedProjectId) => set({ linkedProjectId }),
  setActiveOnly: (activeOnly) => set({ activeOnly }),
  setShowAdvanced: (showAdvanced) => set({ showAdvanced }),
  resetFilters: () =>
    set({
      query: "",
      category: "all",
      linkedProjectId: null,
      activeOnly: false,
      showAdvanced: false,
    }),
}));
