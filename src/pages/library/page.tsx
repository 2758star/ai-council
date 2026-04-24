import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { open as openShell } from "@tauri-apps/plugin-shell";
import { Search } from "lucide-react";
import { parsePdfQuestionBankChunks } from "@/features/ai/workflows";
import { extractPdfText, getQuestionBanks, savePassages } from "@/features/question-bank/api";
import { useQuestionBankStore } from "@/stores/question-bank-store";
import { useUiStore } from "@/stores/ui-store";

type ViewMode = "grid" | "list";
type FileTypeFilter = "all" | "pdf" | "word" | "image";
type SortMode = "recent" | "name" | "size";
type RootFilter = "all" | "recent" | "starred";
type BigCategoryId = "apply" | "qbank" | "notes" | "ref";

type CategoryNode = {
  id: string;
  name: string;
  emoji: string;
  custom?: boolean;
};

type CategoryGroup = {
  id: BigCategoryId;
  name: string;
  children: CategoryNode[];
};

type FileRecordPayload = {
  id: number;
  filePath: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  category: string;
  summary: string | null;
  tagsJson: string | null;
  lastOpenedAt: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

type LibraryFile = {
  id: number;
  name: string;
  filePath: string;
  fileType: string | null;
  fileSize: number | null;
  categoryId: string;
  categoryName: string;
  bigCategoryId: BigCategoryId;
  bigCategoryName: string;
  summary: string | null;
  tagsJson: string | null;
  lastOpenedAt: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  school: string | null;
  isQuestionBank: boolean;
  parsing: boolean;
  parsed: boolean;
  parseProgress: number;
  bankId: number | null;
};

type FileContextMenuState = {
  x: number;
  y: number;
  fileId: number;
};

type CategoryContextMenuState = {
  x: number;
  y: number;
  bigId: BigCategoryId;
  categoryId: string;
};

type MoveModalState = {
  fileId: number;
  bigId: BigCategoryId;
  categoryId: string;
};

type DeleteModalState = {
  fileId: number;
  name: string;
};

type SchoolModalState = {
  fileId: number;
  value: string;
};

type NewFolderState = {
  open: boolean;
  bigId: BigCategoryId;
  name: string;
};

type PersistedCategoryTree = {
  version: number;
  groups: Array<{
    id: BigCategoryId;
    children: Array<{ id: string; name: string; emoji: string; custom?: boolean }>;
  }>;
};

type ImportPayload = {
  imported: number;
  skipped: number;
  failed: number;
  importedFileIds: number[];
  summary: string;
};

const BIG_CATEGORY_ORDER: BigCategoryId[] = ["apply", "qbank", "notes", "ref"];

const BIG_CATEGORY_NAME: Record<BigCategoryId, string> = {
  apply: "申请资料",
  qbank: "题库",
  notes: "备考笔记",
  ref: "参考资料",
};

const BIG_CATEGORY_ID_BY_NAME: Record<string, BigCategoryId> = {
  申请资料: "apply",
  题库: "qbank",
  备考笔记: "notes",
  参考资料: "ref",
};

const DEFAULT_CATEGORIES: CategoryGroup[] = [
  {
    id: "apply",
    name: BIG_CATEGORY_NAME.apply,
    children: [
      { id: "sop", name: "个人陈述 / SOP", emoji: "📋" },
      { id: "lor", name: "推荐信", emoji: "👤" },
      { id: "transcript", name: "成绩单", emoji: "📊" },
      { id: "cv", name: "CV / Resume", emoji: "📄" },
      { id: "school", name: "学校官方资料", emoji: "🏫" },
      { id: "other-apply", name: "其他申请材料", emoji: "📎" },
    ],
  },
  {
    id: "qbank",
    name: BIG_CATEGORY_NAME.qbank,
    children: [
      { id: "gre-read", name: "GRE 阅读", emoji: "📖" },
      { id: "gre-math", name: "GRE 数学", emoji: "🔢" },
      { id: "gre-fill", name: "GRE 填空", emoji: "✏️" },
      { id: "ielts-listen", name: "雅思 听力", emoji: "🎧" },
      { id: "ielts-read", name: "雅思 阅读", emoji: "📗" },
      { id: "ielts-write", name: "雅思 写作", emoji: "✍️" },
    ],
  },
  {
    id: "notes",
    name: BIG_CATEGORY_NAME.notes,
    children: [
      { id: "class-note", name: "课堂笔记", emoji: "📝" },
      { id: "mistake", name: "错题整理", emoji: "🗒️" },
      { id: "vocab", name: "词汇表", emoji: "📌" },
    ],
  },
  {
    id: "ref",
    name: BIG_CATEGORY_NAME.ref,
    children: [
      { id: "web", name: "网页存档", emoji: "🌐" },
      { id: "article", name: "文章收藏", emoji: "📰" },
    ],
  },
];

const ROOT_ITEMS: Array<{ id: RootFilter; emoji: string; name: string }> = [
  { id: "all", emoji: "📁", name: "全部文件" },
  { id: "recent", emoji: "🕐", name: "最近打开" },
  { id: "starred", emoji: "⭐", name: "收藏" },
];

const CATEGORY_SETTING_KEY = "library_category_tree_v2";

function cloneDefaultCategories(): CategoryGroup[] {
  return DEFAULT_CATEGORIES.map((group) => ({
    ...group,
    children: group.children.map((item) => ({ ...item })),
  }));
}

function parseTags(raw: string | null): string[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  } catch {
    return [];
  }
}

function getSchoolFromTags(tags: string[]): string | null {
  const schoolTag = tags.find((item) => item.startsWith("school:"));
  return schoolTag ? schoolTag.replace("school:", "").trim() || null : null;
}

function getBigCategoryFromTags(tags: string[]): BigCategoryId | null {
  const bigTag = tags.find((item) => item.startsWith("big_category:"));
  if (!bigTag) return null;
  const name = bigTag.replace("big_category:", "").trim();
  return BIG_CATEGORY_ID_BY_NAME[name] ?? null;
}

function inferBigCategoryByCategoryName(categoryName: string): BigCategoryId {
  if (categoryName.includes("GRE") || categoryName.includes("雅思")) return "qbank";
  if (
    categoryName.includes("SOP") ||
    categoryName.includes("推荐") ||
    categoryName.includes("成绩") ||
    categoryName.includes("Resume") ||
    categoryName.includes("申请")
  ) {
    return "apply";
  }
  if (
    categoryName.includes("笔记") ||
    categoryName.includes("错题") ||
    categoryName.includes("词汇")
  ) {
    return "notes";
  }
  return "ref";
}

function normalizeCategoryTree(raw: unknown): CategoryGroup[] | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as PersistedCategoryTree;
  if (!Array.isArray(parsed.groups)) return null;
  const next = cloneDefaultCategories();
  const groupMap = new Map(parsed.groups.map((item) => [item.id, item]));
  for (const group of next) {
    const saved = groupMap.get(group.id);
    if (!saved || !Array.isArray(saved.children) || saved.children.length === 0) continue;
    const children: CategoryNode[] = [];
    for (const child of saved.children) {
      if (!child || typeof child.id !== "string" || typeof child.name !== "string") continue;
      const name = child.name.trim();
      if (!name) continue;
      children.push({
        id: child.id.trim() || `c-${Date.now()}`,
        name,
        emoji: typeof child.emoji === "string" && child.emoji.trim() ? child.emoji : "📁",
        custom: Boolean(child.custom),
      });
    }
    if (children.length > 0) {
      group.children = children;
    }
  }
  return next;
}

function serializeCategoryTree(groups: CategoryGroup[]): PersistedCategoryTree {
  return {
    version: 1,
    groups: groups.map((group) => ({
      id: group.id,
      children: group.children.map((child) => ({
        id: child.id,
        name: child.name,
        emoji: child.emoji,
        custom: child.custom ?? false,
      })),
    })),
  };
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function iconByFile(file: LibraryFile): string {
  if (file.isQuestionBank) return "📚";
  const lower = (file.fileType ?? "").toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(lower)) return "🖼️";
  if (["doc", "docx"].includes(lower)) return "📝";
  if (lower === "pdf") return "📄";
  return "📁";
}

function iconBgByFile(file: LibraryFile): string {
  if (file.isQuestionBank) return "#EDE9FE";
  const lower = (file.fileType ?? "").toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(lower)) return "#ECFDF5";
  if (["doc", "docx"].includes(lower)) return "#EFF6FF";
  if (lower === "pdf") return "#FEF2F2";
  return "#F3F4F6";
}

function categoryColor(categoryName: string): { bg: string; color: string } {
  if (categoryName.includes("雅思")) return { bg: "#D1FAE5", color: "#065F46" };
  if (categoryName.includes("GRE")) return { bg: "#EDE9FE", color: "#5B21B6" };
  if (categoryName.includes("申请") || categoryName.includes("SOP") || categoryName.includes("推荐")) {
    return { bg: "#DBEAFE", color: "#1E40AF" };
  }
  if (categoryName.includes("错题")) return { bg: "#FFE4E6", color: "#9F1239" };
  if (categoryName.includes("词汇")) return { bg: "#FEF3C7", color: "#92400E" };
  return { bg: "#F3F4F6", color: "#6B7280" };
}

function formatBytes(size: number | null): string {
  if (size === null || !Number.isFinite(size)) return "--";
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function formatDate(raw: string | null): string {
  if (!raw) return "--";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "--";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

function extensionOf(name: string): string | null {
  const idx = name.lastIndexOf(".");
  if (idx < 0 || idx === name.length - 1) return null;
  return name.slice(idx + 1).toLowerCase();
}

function splitByPassage(raw: string) {
  const normalized = raw.replace(/\r/g, "\n");
  const chunks = normalized
    .split(/(?=\bPassage\s+\d+)/gi)
    .map((value) => value.trim())
    .filter(Boolean);
  if (chunks.length > 0) return chunks;
  return normalized
    .split(/\n{3,}/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function chunkBy<T>(items: T[], size: number) {
  const list: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    list.push(items.slice(index, index + size));
  }
  return list;
}

export function LibraryPage() {
  const [categories, setCategories] = useState<CategoryGroup[]>(() => cloneDefaultCategories());
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [selected, setSelected] = useState<RootFilter | string>("all");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [dragging, setDragging] = useState(false);
  const [hoveredBigCat, setHoveredBigCat] = useState<BigCategoryId | null>(null);
  const [hoveredFileId, setHoveredFileId] = useState<number | null>(null);
  const [addingSubCat, setAddingSubCat] = useState<BigCategoryId | null>(null);
  const [addingSubCatName, setAddingSubCatName] = useState("");
  const [renamingCat, setRenamingCat] = useState<{ categoryId: string; value: string } | null>(null);
  const [renamingFile, setRenamingFile] = useState<{ fileId: number; value: string } | null>(null);
  const [fileMenu, setFileMenu] = useState<FileContextMenuState | null>(null);
  const [catMenu, setCatMenu] = useState<CategoryContextMenuState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteModalState | null>(null);
  const [moveModal, setMoveModal] = useState<MoveModalState | null>(null);
  const [schoolModal, setSchoolModal] = useState<SchoolModalState | null>(null);
  const [newFolder, setNewFolder] = useState<NewFolderState>({ open: false, bigId: "apply", name: "" });
  const [dragCategory, setDragCategory] = useState<{ bigId: BigCategoryId; categoryId: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const setRoute = useUiStore((state) => state.setRoute);
  const setActiveBankId = useQuestionBankStore((state) => state.setActiveBankId);
  const setActiveBankName = useQuestionBankStore((state) => state.setActiveBankName);

  const categoryLookup = useMemo(() => {
    const byId = new Map<
      string,
      { bigId: BigCategoryId; bigName: string; categoryId: string; categoryName: string; emoji: string }
    >();
    const byName = new Map<string, { bigId: BigCategoryId; categoryId: string }>();
    for (const group of categories) {
      for (const child of group.children) {
        byId.set(child.id, {
          bigId: group.id,
          bigName: group.name,
          categoryId: child.id,
          categoryName: child.name,
          emoji: child.emoji,
        });
        byName.set(`${group.id}::${child.name}`, {
          bigId: group.id,
          categoryId: child.id,
        });
      }
    }
    return { byId, byName };
  }, [categories]);

  const rootCounts = useMemo(
    () => ({
      all: files.length,
      recent: files.filter((file) => Boolean(file.lastOpenedAt)).length,
      starred: files.filter((file) => file.isFavorite).length,
    }),
    [files],
  );

  const categoryCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const file of files) {
      map.set(file.categoryId, (map.get(file.categoryId) ?? 0) + 1);
    }
    return map;
  }, [files]);

  const filteredFiles = useMemo(() => {
    const queryText = query.trim().toLowerCase();
    const list = files.filter((file) => {
      if (selected === "all") {
        // keep all
      } else if (selected === "recent") {
        if (!file.lastOpenedAt) return false;
      } else if (selected === "starred") {
        if (!file.isFavorite) return false;
      } else if ((BIG_CATEGORY_ORDER as string[]).includes(selected)) {
        if (file.bigCategoryId !== selected) return false;
      } else if (file.categoryId !== selected) {
        return false;
      }

      if (typeFilter !== "all") {
        const ext = (file.fileType ?? extensionOf(file.name) ?? "").toLowerCase();
        const isPdf = ext === "pdf";
        const isWord = ext === "doc" || ext === "docx";
        const isImage = ["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(ext);
        if (typeFilter === "pdf" && !isPdf) return false;
        if (typeFilter === "word" && !isWord) return false;
        if (typeFilter === "image" && !isImage) return false;
      }

      if (queryText) {
        const searchable = `${file.name} ${file.categoryName} ${file.bigCategoryName} ${file.school ?? ""}`.toLowerCase();
        if (!searchable.includes(queryText)) return false;
      }
      return true;
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name, "zh-Hans-CN");
      if (sortMode === "size") return (b.fileSize ?? 0) - (a.fileSize ?? 0);
      const at = Date.parse(a.lastOpenedAt ?? a.updatedAt ?? a.createdAt);
      const bt = Date.parse(b.lastOpenedAt ?? b.updatedAt ?? b.createdAt);
      return (Number.isNaN(bt) ? 0 : bt) - (Number.isNaN(at) ? 0 : at);
    });
    return sorted;
  }, [files, query, selected, sortMode, typeFilter]);

  const selectedPath = useMemo(() => {
    if (selected === "all") return ["全部文件"];
    if (selected === "recent") return ["最近打开"];
    if (selected === "starred") return ["收藏"];
    if ((BIG_CATEGORY_ORDER as string[]).includes(selected)) {
      return [BIG_CATEGORY_NAME[selected as BigCategoryId]];
    }
    const meta = categoryLookup.byId.get(selected);
    if (!meta) return ["全部文件"];
    return [meta.bigName, meta.categoryName];
  }, [categoryLookup.byId, selected]);

  function setNoticeText(text: string | null) {
    setNotice(text);
    if (!text) return;
    window.setTimeout(() => setNotice((current) => (current === text ? null : current)), 2400);
  }

  async function persistCategoryTree(next: CategoryGroup[]) {
    const payload = JSON.stringify(serializeCategoryTree(next));
    await invoke("set_app_setting", { key: CATEGORY_SETTING_KEY, value: payload });
  }

  function resolveCategoryById(categoryId: string): { group: CategoryGroup; child: CategoryNode } | null {
    for (const group of categories) {
      const child = group.children.find((item) => item.id === categoryId);
      if (child) return { group, child };
    }
    return null;
  }

  function resolveDefaultImportTarget() {
    const firstGroup = categories.find((group) => group.children.length > 0) ?? categories[0];
    const firstChild = firstGroup.children[0];
    return { bigId: firstGroup.id, categoryId: firstChild.id };
  }

  function resolveImportTarget() {
    if ((BIG_CATEGORY_ORDER as string[]).includes(selected)) {
      const bigId = selected as BigCategoryId;
      const child = categories.find((group) => group.id === bigId)?.children[0];
      if (child) return { bigId, categoryId: child.id };
    }
    const match = categoryLookup.byId.get(selected);
    if (match) return { bigId: match.bigId, categoryId: match.categoryId };
    return resolveDefaultImportTarget();
  }

  function startRenameFile(file: LibraryFile) {
    setRenamingFile({ fileId: file.id, value: file.name });
    setFileMenu(null);
  }

  async function openFile(file: LibraryFile) {
    try {
      await invoke("open_library_file", { fileId: file.id, filePath: file.filePath });
      const now = new Date().toISOString();
      setFiles((prev) => prev.map((item) => (item.id === file.id ? { ...item, lastOpenedAt: now } : item)));
    } catch (error) {
      setNoticeText(`打开失败：${String(error)}`);
    }
  }

  async function openFileWithShell(file: LibraryFile) {
    try {
      await openShell(file.filePath);
      const now = new Date().toISOString();
      setFiles((prev) => prev.map((item) => (item.id === file.id ? { ...item, lastOpenedAt: now } : item)));
    } catch (error) {
      setNoticeText(`打开失败：${String(error)}`);
    }
  }

  async function toggleStar(fileId: number) {
    const previous = files;
    setFiles((prev) => prev.map((item) => (item.id === fileId ? { ...item, isFavorite: !item.isFavorite } : item)));
    try {
      const next = await invoke<boolean>("toggle_favorite", { fileId });
      setFiles((prev) => prev.map((item) => (item.id === fileId ? { ...item, isFavorite: next } : item)));
    } catch {
      setFiles(previous);
      setNoticeText("收藏状态更新失败，已回滚。");
    }
  }

  async function confirmRenameFile(fileId: number, nextRaw: string) {
    const nextName = nextRaw.trim();
    const current = files.find((item) => item.id === fileId);
    if (!current) {
      setRenamingFile(null);
      return;
    }
    if (!nextName || nextName === current.name) {
      setRenamingFile(null);
      return;
    }
    const previous = files;
    setFiles((prev) => prev.map((item) => (item.id === fileId ? { ...item, name: nextName } : item)));
    setRenamingFile(null);
    try {
      await invoke("rename_library_file", { fileId, newName: nextName });
    } catch {
      setFiles(previous);
      setNoticeText("重命名失败，已回滚。");
    }
  }

  async function deleteFile(fileId: number) {
    const previous = files;
    setFiles((prev) => prev.filter((item) => item.id !== fileId));
    setDeleteTarget(null);
    try {
      await invoke("delete_library_file", { fileId });
    } catch {
      setFiles(previous);
      setNoticeText("删除失败，已回滚。");
    }
  }

  async function confirmMoveCategory() {
    if (!moveModal) return;
    const nextMeta = categoryLookup.byId.get(moveModal.categoryId);
    if (!nextMeta) {
      setNoticeText("目标分类不存在。");
      return;
    }
    const previous = files;
    setFiles((prev) =>
      prev.map((item) =>
        item.id === moveModal.fileId
          ? {
              ...item,
              categoryId: nextMeta.categoryId,
              categoryName: nextMeta.categoryName,
              bigCategoryId: nextMeta.bigId,
              bigCategoryName: nextMeta.bigName,
            }
          : item,
      ),
    );
    setMoveModal(null);
    try {
      await invoke("move_library_file", {
        fileId: moveModal.fileId,
        newCategory: nextMeta.categoryName,
        newBigCategory: nextMeta.bigName,
      });
    } catch {
      setFiles(previous);
      setNoticeText("修改分类失败，已回滚。");
    }
  }

  async function confirmSchool() {
    if (!schoolModal) return;
    const file = files.find((item) => item.id === schoolModal.fileId);
    if (!file) {
      setSchoolModal(null);
      return;
    }
    const next = schoolModal.value.trim();
    const previous = files;
    setFiles((prev) =>
      prev.map((item) => (item.id === schoolModal.fileId ? { ...item, school: next || null } : item)),
    );
    setSchoolModal(null);
    try {
      await invoke("set_library_file_school", { fileId: file.id, school: next || null });
    } catch {
      setFiles(previous);
      setNoticeText("学校关联更新失败，已回滚。");
    }
  }

  async function createSubCategory(bigId: BigCategoryId, nameRaw: string) {
    const name = nameRaw.trim();
    if (!name) {
      setAddingSubCat(null);
      setAddingSubCatName("");
      return;
    }
    const duplicate = categories.some(
      (group) =>
        group.id === bigId &&
        group.children.some((child) => child.name.toLowerCase() === name.toLowerCase()),
    );
    if (duplicate) {
      setNoticeText("同一大类下已存在同名分类。");
      return;
    }
    const previous = categories;
    const tempId = `custom-${Date.now()}`;
    const next = categories.map((group) =>
      group.id === bigId
        ? { ...group, children: [...group.children, { id: tempId, name, emoji: "📁", custom: true }] }
        : group,
    );
    setCategories(next);
    setSelected(tempId);
    setAddingSubCat(null);
    setAddingSubCatName("");
    try {
      await persistCategoryTree(next);
    } catch {
      setCategories(previous);
      setSelected("all");
      setNoticeText("新建分类失败，已回滚。");
    }
  }

  async function confirmRenameCategory(categoryId: string, nextRaw: string) {
    const nextName = nextRaw.trim();
    if (!nextName) {
      setRenamingCat(null);
      return;
    }
    const currentMeta = resolveCategoryById(categoryId);
    if (!currentMeta || currentMeta.child.name === nextName) {
      setRenamingCat(null);
      return;
    }
    const duplicate = categories.some(
      (group) =>
        group.id === currentMeta.group.id &&
        group.children.some(
          (child) =>
            child.id !== categoryId &&
            child.name.toLowerCase() === nextName.toLowerCase(),
        ),
    );
    if (duplicate) {
      setNoticeText("同一大类下已存在同名分类。");
      return;
    }
    const previousCategories = categories;
    const previousFiles = files;
    const nextCategories = categories.map((group) =>
      group.id === currentMeta.group.id
        ? {
            ...group,
            children: group.children.map((child) =>
              child.id === categoryId ? { ...child, name: nextName } : child,
            ),
          }
        : group,
    );
    const affectedFiles = files.filter((file) => file.categoryId === categoryId);
    const nextFiles = files.map((file) =>
      file.categoryId === categoryId ? { ...file, categoryName: nextName } : file,
    );
    setCategories(nextCategories);
    setFiles(nextFiles);
    setRenamingCat(null);
    try {
      await Promise.all(
        affectedFiles.map((file) =>
          invoke("move_library_file", {
            fileId: file.id,
            newCategory: nextName,
            newBigCategory: BIG_CATEGORY_NAME[file.bigCategoryId],
          }),
        ),
      );
      await persistCategoryTree(nextCategories);
    } catch {
      setCategories(previousCategories);
      setFiles(previousFiles);
      setNoticeText("分类重命名失败，已回滚。");
    }
  }

  async function deleteCategory(categoryId: string) {
    const meta = resolveCategoryById(categoryId);
    if (!meta) return;
    const count = categoryCountMap.get(categoryId) ?? 0;
    if (count > 0) {
      setNoticeText("请先移走所有文件");
      return;
    }
    const previous = categories;
    const next = categories.map((group) =>
      group.id === meta.group.id
        ? { ...group, children: group.children.filter((child) => child.id !== categoryId) }
        : group,
    );
    setCategories(next);
    if (selected === categoryId) setSelected(meta.group.id);
    try {
      await persistCategoryTree(next);
    } catch {
      setCategories(previous);
      setNoticeText("删除分类失败，已回滚。");
    }
  }

  async function reorderCategory(
    bigId: BigCategoryId,
    sourceId: string,
    targetId: string,
  ) {
    if (sourceId === targetId) return;
    const previous = categories;
    const next = categories.map((group) => {
      if (group.id !== bigId) return group;
      const sourceIndex = group.children.findIndex((child) => child.id === sourceId);
      const targetIndex = group.children.findIndex((child) => child.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return group;
      const children = [...group.children];
      const [moving] = children.splice(sourceIndex, 1);
      children.splice(targetIndex, 0, moving);
      return { ...group, children };
    });
    setCategories(next);
    try {
      await persistCategoryTree(next);
    } catch {
      setCategories(previous);
      setNoticeText("分类排序保存失败，已回滚。");
    }
  }

  async function createFolderFromToolbar() {
    const name = newFolder.name.trim();
    if (!name) {
      setNewFolder((prev) => ({ ...prev, open: false }));
      return;
    }
    await createSubCategory(newFolder.bigId, name);
    setNewFolder({ open: false, bigId: newFolder.bigId, name: "" });
  }

  async function parseQuestionBank(file: LibraryFile) {
    if (!file.isQuestionBank || file.parsing) return;
    const ext = (file.fileType ?? extensionOf(file.name) ?? "").toLowerCase();
    if (ext !== "pdf") {
      setNoticeText("题库解析目前仅支持 PDF。");
      return;
    }
    setFiles((prev) =>
      prev.map((item) =>
        item.id === file.id ? { ...item, parsing: true, parsed: false, parseProgress: 1 } : item,
      ),
    );
    try {
      const text = await extractPdfText(file.filePath);
      const passages = splitByPassage(text);
      const chunks = chunkBy(passages, 15).map((piece) => piece.join("\n\n"));
      const parsed = await parsePdfQuestionBankChunks(chunks, (doneCount) => {
        const percent = Math.min(100, Math.round((doneCount / Math.max(chunks.length, 1)) * 100));
        setFiles((prev) =>
          prev.map((item) =>
            item.id === file.id ? { ...item, parsing: true, parseProgress: percent } : item,
          ),
        );
      });
      const subjectHint = file.categoryName.includes("雅思")
        ? "雅思"
        : file.categoryName.includes("GRE")
          ? "GRE"
          : null;
      const bankId = await savePassages(JSON.stringify(parsed), file.name, subjectHint);
      setFiles((prev) =>
        prev.map((item) =>
          item.id === file.id
            ? { ...item, parsing: false, parsed: true, parseProgress: 100, bankId }
            : item,
        ),
      );
    } catch {
      setFiles((prev) =>
        prev.map((item) =>
          item.id === file.id
            ? { ...item, parsing: false, parsed: false, parseProgress: 0, bankId: null }
            : item,
        ),
      );
      setNoticeText("题库解析失败，请检查文件内容后重试。");
    }
  }

  function startExam(file: LibraryFile) {
    if (!file.parsed || !file.bankId) return;
    setActiveBankId(file.bankId);
    setActiveBankName(file.name);
    setRoute("question-bank-list");
  }

  async function importFromPaths(paths: string[]) {
    if (paths.length === 0) return;
    const target = resolveImportTarget();
    const targetMeta = categoryLookup.byId.get(target.categoryId);
    if (!targetMeta) {
      setNoticeText("请选择有效分类后再导入。");
      return;
    }
    try {
      const result = await invoke<ImportPayload>("import_library_files_to_documents", {
        filePaths: paths,
        bigCategory: BIG_CATEGORY_NAME[target.bigId],
        category: targetMeta.categoryName,
      });
      await loadFiles(categories);
      setNoticeText(result.summary);
    } catch (error) {
      setNoticeText(`导入失败：${String(error)}`);
    }
  }

  async function handleImportClick() {
    const selectedPaths = await openDialog({
      multiple: true,
      filters: [{ name: "Library Files", extensions: ["pdf", "doc", "docx", "txt", "md", "png", "jpg", "jpeg", "webp"] }],
    });
    if (!selectedPaths) return;
    const paths = Array.isArray(selectedPaths) ? selectedPaths : [selectedPaths];
    await importFromPaths(paths);
  }

  const loadFiles = useCallback(async (baseCategories: CategoryGroup[]) => {
    const rows = await invoke<FileRecordPayload[]>("list_library_files", {
      query: null,
      category: null,
      favoritesOnly: false,
      matchMode: null,
    });
    const mutableCategories = baseCategories.map((group) => ({
      ...group,
      children: group.children.map((child) => ({ ...child })),
    }));
    const findOrCreateCategory = (bigId: BigCategoryId, categoryName: string) => {
      const group = mutableCategories.find((item) => item.id === bigId);
      if (!group) return { bigId: "ref" as BigCategoryId, categoryId: "web", categoryName: "网页存档" };
      const existing = group.children.find((child) => child.name === categoryName);
      if (existing) {
        return { bigId, categoryId: existing.id, categoryName: existing.name };
      }
      const newId = `auto-${slug(categoryName)}-${Date.now()}`;
      group.children.push({ id: newId, name: categoryName, emoji: "📁", custom: true });
      return { bigId, categoryId: newId, categoryName };
    };

    const mapped: LibraryFile[] = rows.map((row) => {
      const tags = parseTags(row.tagsJson);
      const fromTag = getBigCategoryFromTags(tags);
      const fromCategory = (() => {
        for (const group of mutableCategories) {
          if (group.children.some((child) => child.name === row.category)) return group.id;
        }
        return null;
      })();
      const bigId = fromTag ?? fromCategory ?? inferBigCategoryByCategoryName(row.category);
      const categoryMeta = findOrCreateCategory(bigId, row.category);
      return {
        id: row.id,
        name: row.fileName,
        filePath: row.filePath,
        fileType: row.fileType,
        fileSize: row.fileSize,
        categoryId: categoryMeta.categoryId,
        categoryName: categoryMeta.categoryName,
        bigCategoryId: categoryMeta.bigId,
        bigCategoryName: BIG_CATEGORY_NAME[categoryMeta.bigId],
        summary: row.summary,
        tagsJson: row.tagsJson,
        lastOpenedAt: row.lastOpenedAt,
        isFavorite: row.isFavorite,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        school: getSchoolFromTags(tags),
        isQuestionBank: categoryMeta.bigId === "qbank",
        parsing: false,
        parsed: false,
        parseProgress: 0,
        bankId: null,
      };
    });

    setCategories(mutableCategories);
    setFiles(mapped);
    try {
      const banks = await getQuestionBanks();
      const bankByName = new Map(
        banks.map((bank) => [bank.name.trim().toLowerCase(), bank.id]),
      );
      setFiles((prev) =>
        prev.map((file) => {
          if (!file.isQuestionBank) return file;
          const bankId = bankByName.get(file.name.trim().toLowerCase()) ?? null;
          return bankId ? { ...file, parsed: true, parseProgress: 100, bankId } : file;
        }),
      );
    } catch {
      // ignore question-bank cache preload failures
    }
  }, []);

  const loadInitial = useCallback(async () => {
    let nextCategories = cloneDefaultCategories();
    try {
      const savedTree = await invoke<string | null>("get_app_setting", { key: CATEGORY_SETTING_KEY });
      if (savedTree) {
        const parsed = JSON.parse(savedTree) as unknown;
        const normalized = normalizeCategoryTree(parsed);
        if (normalized) {
          nextCategories = normalized;
        }
      }
    } catch {
      // ignore invalid saved state
    }
    await loadFiles(nextCategories);
  }, [loadFiles]);

  useEffect(() => {
    loadInitial().catch(() => setNoticeText("资料库初始化失败，请稍后重试。"));
  }, [loadInitial]);

  useEffect(() => {
    const closeMenus = () => {
      setFileMenu(null);
      setCatMenu(null);
    };
    window.addEventListener("click", closeMenus);
    return () => window.removeEventListener("click", closeMenus);
  }, []);

  const fileMenuTarget = fileMenu ? files.find((item) => item.id === fileMenu.fileId) ?? null : null;
  const catMenuTarget = catMenu ? resolveCategoryById(catMenu.categoryId) : null;

  return (
    <section
      style={{
        position: "relative",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
        background: "#F5F5F7",
      }}
    >
      <header
        style={{
          height: 52,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F" }}>资料库</div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative", width: 260 }}>
            <Search
              size={14}
              style={{ position: "absolute", left: 10, top: 8, color: "#86868B" }}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索文件"
              style={{
                width: "100%",
                height: 30,
                background: "rgba(0,0,0,0.05)",
                borderRadius: 8,
                border: "none",
                fontSize: 12,
                padding: "0 12px 0 32px",
                outline: "none",
                color: "#1D1D1F",
              }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setNewFolder((prev) => ({ ...prev, open: true }))}
          style={{
            height: 32,
            borderRadius: 8,
            border: "0.5px solid rgba(0,0,0,0.12)",
            background: "transparent",
            color: "#6366F1",
            padding: "0 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          新建文件夹
        </button>
        <button
          type="button"
          onClick={() => handleImportClick().catch(() => undefined)}
          style={{
            height: 32,
            borderRadius: 8,
            border: "none",
            background: "#6366F1",
            color: "#fff",
            padding: "0 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          导入文件
        </button>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <aside
          style={{
            width: 200,
            background: "rgba(255,255,255,0.45)",
            borderRight: "1px solid rgba(0,0,0,0.06)",
            padding: "10px 8px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {ROOT_ITEMS.map((item) => {
            const active = selected === item.id;
            const count = rootCounts[item.id];
            return (
              <div
                key={item.id}
                onClick={() => setSelected(item.id)}
                style={{
                  height: 32,
                  padding: "0 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: active ? "rgba(255,255,255,0.9)" : "transparent",
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 14 }}>{item.emoji}</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    color: active ? "#6366F1" : "#1D1D1F",
                    flex: 1,
                  }}
                >
                  {item.name}
                </span>
                <span style={{ fontSize: 10, color: "#C7C7CC" }}>{count}</span>
              </div>
            );
          })}

          {categories.map((group) => (
            <div
              key={group.id}
              onMouseEnter={() => setHoveredBigCat(group.id)}
              onMouseLeave={() => setHoveredBigCat(null)}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 6px 4px",
                  cursor: "default",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#C7C7CC",
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    flex: 1,
                  }}
                >
                  {group.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAddingSubCat(group.id);
                    setAddingSubCatName("");
                  }}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    background: "transparent",
                    border: "none",
                    color: "#C7C7CC",
                    cursor: "pointer",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: hoveredBigCat === group.id ? 1 : 0,
                    transition: "opacity 0.15s",
                  }}
                >
                  +
                </button>
              </div>

              {addingSubCat === group.id ? (
                <div style={{ padding: "2px 10px 2px 18px" }}>
                  <input
                    autoFocus
                    placeholder="新分类名称"
                    value={addingSubCatName}
                    onChange={(event) => setAddingSubCatName(event.target.value)}
                    onBlur={() => {
                      createSubCategory(group.id, addingSubCatName).catch(() => undefined);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        createSubCategory(group.id, addingSubCatName).catch(() => undefined);
                      }
                      if (event.key === "Escape") {
                        setAddingSubCat(null);
                        setAddingSubCatName("");
                      }
                    }}
                    style={{
                      width: "100%",
                      height: 26,
                      borderRadius: 6,
                      border: "1px solid rgba(99,102,241,0.4)",
                      background: "rgba(99,102,241,0.05)",
                      padding: "0 8px",
                      fontSize: 12,
                      fontFamily: "inherit",
                      outline: "none",
                      color: "#1D1D1F",
                    }}
                  />
                </div>
              ) : null}

              {group.children.map((child) => {
                const active = selected === child.id;
                const count = categoryCountMap.get(child.id) ?? 0;
                const isRenaming = renamingCat?.categoryId === child.id;
                return (
                  <div
                    key={child.id}
                    draggable
                    onDragStart={() => setDragCategory({ bigId: group.id, categoryId: child.id })}
                    onDragEnd={() => setDragCategory(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (!dragCategory || dragCategory.bigId !== group.id) return;
                      reorderCategory(group.id, dragCategory.categoryId, child.id).catch(() => undefined);
                      setDragCategory(null);
                    }}
                  >
                    <div
                      onClick={() => setSelected(child.id)}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setCatMenu({
                          x: event.clientX,
                          y: event.clientY,
                          bigId: group.id,
                          categoryId: child.id,
                        });
                      }}
                      style={{
                        height: 30,
                        padding: "0 10px 0 18px",
                        borderRadius: 8,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        background: active ? "rgba(255,255,255,0.9)" : "transparent",
                        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                        transition: "background 0.12s, box-shadow 0.12s",
                      }}
                    >
                      <span style={{ fontSize: 13 }}>{child.emoji}</span>
                      {isRenaming ? (
                        <input
                          autoFocus
                          value={renamingCat.value}
                          onChange={(event) => setRenamingCat({ categoryId: child.id, value: event.target.value })}
                          onBlur={() => confirmRenameCategory(child.id, renamingCat.value).catch(() => undefined)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              confirmRenameCategory(child.id, renamingCat.value).catch(() => undefined);
                            }
                            if (event.key === "Escape") {
                              setRenamingCat(null);
                            }
                          }}
                          style={{
                            flex: 1,
                            border: "none",
                            outline: "none",
                            borderBottom: "1px solid #6366F1",
                            background: "transparent",
                            fontSize: 12,
                            fontFamily: "inherit",
                            color: "#1D1D1F",
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: active ? 600 : 400,
                            color: active ? "#6366F1" : "#1D1D1F",
                            flex: 1,
                          }}
                        >
                          {child.name}
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: "#C7C7CC" }}>{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </aside>

        <section style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div
            style={{
              height: 44,
              padding: "0 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12, color: "#86868B" }}>
              {selectedPath.map((name, index) => (
                <span key={`${name}-${index}`}>
                  <span style={{ color: index === selectedPath.length - 1 ? "#1D1D1F" : "#86868B", fontWeight: index === selectedPath.length - 1 ? 600 : 400 }}>
                    {name}
                  </span>
                  {index < selectedPath.length - 1 ? " / " : ""}
                </span>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {([
                { id: "all", label: "全部" },
                { id: "pdf", label: "PDF" },
                { id: "word", label: "Word" },
                { id: "image", label: "图片" },
              ] as Array<{ id: FileTypeFilter; label: string }>).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTypeFilter(item.id)}
                  style={{
                    height: 24,
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    padding: "0 9px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: typeFilter === item.id ? "#4338CA" : "#6B7280",
                    background: typeFilter === item.id ? "#EEF2FF" : "rgba(0,0,0,0.04)",
                    fontFamily: "inherit",
                  }}
                >
                  {item.label}
                </button>
              ))}
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                style={{
                  height: 26,
                  borderRadius: 7,
                  border: "0.5px solid rgba(0,0,0,0.1)",
                  background: "rgba(255,255,255,0.85)",
                  fontSize: 11,
                  color: "#4B5563",
                  padding: "0 8px",
                  fontFamily: "inherit",
                }}
              >
                <option value="recent">最近添加</option>
                <option value="name">文件名</option>
                <option value="size">大小</option>
              </select>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  style={{
                    height: 26,
                    width: 28,
                    borderRadius: 7,
                    border: "none",
                    background: viewMode === "grid" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.04)",
                    color: viewMode === "grid" ? "#6366F1" : "#6B7280",
                    cursor: "pointer",
                  }}
                >
                  ▦
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  style={{
                    height: 26,
                    width: 28,
                    borderRadius: 7,
                    border: "none",
                    background: viewMode === "list" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.04)",
                    color: viewMode === "list" ? "#6366F1" : "#6B7280",
                    cursor: "pointer",
                  }}
                >
                  ☰
                </button>
              </div>
            </div>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const paths = Array.from(event.dataTransfer.files)
                .map((file) => (file as File & { path?: string }).path ?? "")
                .filter((path) => Boolean(path));
              importFromPaths(paths).catch(() => undefined);
            }}
            onClick={() => handleImportClick().catch(() => undefined)}
            style={{
              margin: "10px 12px 0",
              height: 72,
              borderRadius: 12,
              border: `2px dashed ${dragging ? "rgba(99,102,241,0.6)" : "rgba(99,102,241,0.2)"}`,
              background: dragging ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.02)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <div style={{ fontSize: 22 }}>📁</div>
            <div style={{ fontSize: 13, color: "#6366F1", fontWeight: 500 }}>拖拽文件到此处，或点击导入</div>
            <div style={{ fontSize: 11, color: "#86868B" }}>支持 PDF、Word、图片，自动分类入库</div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            {viewMode === "grid" ? (
              <div
                style={{
                  height: "100%",
                  padding: "10px 12px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
                  gap: 8,
                  overflowY: "auto",
                }}
              >
                {filteredFiles.map((file) => {
                  const catTone = categoryColor(file.categoryName);
                  const isRenaming = renamingFile?.fileId === file.id;
                  return (
                    <div
                      key={file.id}
                      onMouseEnter={() => setHoveredFileId(file.id)}
                      onMouseLeave={() => setHoveredFileId(null)}
                      onDoubleClick={() => openFile(file).catch(() => undefined)}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setFileMenu({ x: event.clientX, y: event.clientY, fileId: file.id });
                      }}
                      style={{
                        borderRadius: 12,
                        padding: 12,
                        background: "rgba(255,255,255,0.82)",
                        border: "0.5px solid rgba(0,0,0,0.07)",
                        cursor: "pointer",
                        position: "relative",
                        transition: "all 0.15s",
                        transform: hoveredFileId === file.id ? "translateY(-2px)" : "translateY(0)",
                        boxShadow:
                          hoveredFileId === file.id
                            ? "0 6px 16px rgba(0,0,0,0.1)"
                            : "0 1px 3px rgba(0,0,0,0.04)",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          display: "flex",
                          gap: 3,
                          opacity: hoveredFileId === file.id ? 1 : 0,
                          transition: "opacity 0.15s",
                        }}
                      >
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleStar(file.id).catch(() => undefined);
                          }}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            background: "rgba(255,255,255,0.95)",
                            border: "0.5px solid rgba(0,0,0,0.08)",
                            cursor: "pointer",
                            fontSize: 11,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {file.isFavorite ? "⭐" : "☆"}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setFileMenu({ x: event.clientX, y: event.clientY, fileId: file.id });
                          }}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            background: "rgba(255,255,255,0.95)",
                            border: "0.5px solid rgba(0,0,0,0.08)",
                            cursor: "pointer",
                            color: "#86868B",
                            fontSize: 13,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ···
                        </button>
                      </div>

                      <div
                        style={{
                          height: 72,
                          borderRadius: 9,
                          background: iconBgByFile(file),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 32,
                          marginBottom: 8,
                        }}
                      >
                        {iconByFile(file)}
                      </div>

                      {isRenaming ? (
                        <input
                          autoFocus
                          value={renamingFile.value}
                          onChange={(event) =>
                            setRenamingFile({ fileId: file.id, value: event.target.value })
                          }
                          onBlur={() => confirmRenameFile(file.id, renamingFile.value).catch(() => undefined)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              confirmRenameFile(file.id, renamingFile.value).catch(() => undefined);
                            }
                            if (event.key === "Escape") {
                              setRenamingFile(null);
                            }
                          }}
                          style={{
                            width: "100%",
                            border: "none",
                            borderBottom: "1.5px solid #6366F1",
                            outline: "none",
                            background: "transparent",
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: "inherit",
                            color: "#1D1D1F",
                            marginBottom: 6,
                          }}
                        />
                      ) : (
                        <div
                          onDoubleClick={(event) => {
                            event.stopPropagation();
                            startRenameFile(file);
                          }}
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#1D1D1F",
                            lineHeight: 1.4,
                            marginBottom: 6,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {file.name}
                        </div>
                      )}

                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: 99,
                            background: catTone.bg,
                            color: catTone.color,
                          }}
                        >
                          {file.categoryName}
                        </span>
                        <span style={{ fontSize: 10, color: "#C7C7CC", marginLeft: "auto" }}>
                          {formatDate(file.updatedAt)}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: "#C7C7CC", marginTop: 2 }}>{formatBytes(file.fileSize)}</div>
                      {file.school ? (
                        <div style={{ fontSize: 10, color: "#6366F1", fontWeight: 500, marginTop: 2 }}>
                          关联 {file.school}
                        </div>
                      ) : null}

                      {file.isQuestionBank ? (
                        <div
                          style={{
                            display: "flex",
                            gap: 5,
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: "0.5px solid rgba(0,0,0,0.06)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              parseQuestionBank(file).catch(() => undefined);
                            }}
                            style={{
                              flex: 1,
                              height: 26,
                              borderRadius: 7,
                              border: "none",
                              cursor: "pointer",
                              fontFamily: "inherit",
                              fontSize: 10,
                              fontWeight: 600,
                              background: file.parsed ? "#D1FAE5" : "#EDE9FE",
                              color: file.parsed ? "#065F46" : "#5B21B6",
                            }}
                          >
                            {file.parsing
                              ? `解析中 ${file.parseProgress}%`
                              : file.parsed
                                ? "✓ 已解析"
                                : "解析题库"}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              startExam(file);
                            }}
                            disabled={!file.parsed || !file.bankId}
                            style={{
                              flex: 1,
                              height: 26,
                              borderRadius: 7,
                              border: "none",
                              cursor: file.parsed && file.bankId ? "pointer" : "not-allowed",
                              fontFamily: "inherit",
                              fontSize: 10,
                              fontWeight: 600,
                              background: file.parsed && file.bankId ? "#6366F1" : "rgba(0,0,0,0.06)",
                              color: file.parsed && file.bankId ? "#fff" : "#C7C7CC",
                            }}
                          >
                            开始做题
                          </button>
                        </div>
                      ) : hoveredFileId === file.id ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openFile(file).catch(() => undefined);
                          }}
                          style={{
                            width: "100%",
                            height: 26,
                            marginTop: 8,
                            borderRadius: 7,
                            border: "0.5px solid rgba(0,0,0,0.1)",
                            background: "rgba(0,0,0,0.04)",
                            color: "#86868B",
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          打开
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ height: "100%", padding: "10px 12px", overflowY: "auto" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0,1.6fr) 0.8fr 0.7fr 0.7fr 0.8fr 86px",
                    alignItems: "center",
                    fontSize: 11,
                    color: "#86868B",
                    fontWeight: 600,
                    padding: "0 10px 8px",
                  }}
                >
                  <span>文件名</span>
                  <span>分类</span>
                  <span>关联学校</span>
                  <span>大小</span>
                  <span>日期</span>
                  <span style={{ textAlign: "right" }}>操作</span>
                </div>
                {filteredFiles.map((file) => {
                  const isRenaming = renamingFile?.fileId === file.id;
                  return (
                    <div
                      key={file.id}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setFileMenu({ x: event.clientX, y: event.clientY, fileId: file.id });
                      }}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0,1.6fr) 0.8fr 0.7fr 0.7fr 0.8fr 86px",
                        alignItems: "center",
                        minHeight: 42,
                        borderRadius: 8,
                        padding: "0 10px",
                        fontSize: 11,
                        color: "#374151",
                        background: "transparent",
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background = "rgba(0,0,0,0.03)";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = "transparent";
                      }}
                    >
                      {isRenaming ? (
                        <input
                          autoFocus
                          value={renamingFile.value}
                          onChange={(event) =>
                            setRenamingFile({ fileId: file.id, value: event.target.value })
                          }
                          onBlur={() => confirmRenameFile(file.id, renamingFile.value).catch(() => undefined)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              confirmRenameFile(file.id, renamingFile.value).catch(() => undefined);
                            }
                            if (event.key === "Escape") setRenamingFile(null);
                          }}
                          style={{
                            border: "none",
                            borderBottom: "1px solid #6366F1",
                            outline: "none",
                            background: "transparent",
                            fontSize: 11,
                            fontWeight: 600,
                            minWidth: 0,
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontWeight: 600,
                            color: "#1D1D1F",
                          }}
                          onDoubleClick={() => startRenameFile(file)}
                        >
                          {file.name}
                        </span>
                      )}
                      <span style={{ color: "#6B7280" }}>{file.categoryName}</span>
                      <span style={{ color: file.school ? "#6366F1" : "#9CA3AF" }}>{file.school ?? "-"}</span>
                      <span style={{ color: "#6B7280" }}>{formatBytes(file.fileSize)}</span>
                      <span style={{ color: "#6B7280" }}>{formatDate(file.updatedAt)}</span>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => openFile(file).catch(() => undefined)}
                          style={{
                            height: 24,
                            borderRadius: 6,
                            border: "0.5px solid rgba(0,0,0,0.1)",
                            background: "rgba(255,255,255,0.85)",
                            fontSize: 11,
                            color: "#4B5563",
                            padding: "0 8px",
                            cursor: "pointer",
                          }}
                        >
                          打开
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setFileMenu({ x: event.clientX, y: event.clientY, fileId: file.id });
                          }}
                          style={{
                            height: 24,
                            width: 24,
                            borderRadius: 6,
                            border: "0.5px solid rgba(0,0,0,0.1)",
                            background: "rgba(255,255,255,0.85)",
                            fontSize: 12,
                            color: "#86868B",
                            cursor: "pointer",
                          }}
                        >
                          ···
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {fileMenu && fileMenuTarget ? (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 998 }} onClick={() => setFileMenu(null)} />
          <div
            style={{
              position: "fixed",
              left: Math.min(fileMenu.x, window.innerWidth - 180),
              top: Math.min(fileMenu.y, window.innerHeight - 230),
              background: "#fff",
              borderRadius: 10,
              border: "0.5px solid rgba(0,0,0,0.1)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
              padding: 4,
              minWidth: 168,
              zIndex: 999,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {[
              { icon: "📂", label: "打开", action: () => openFileWithShell(fileMenuTarget).catch(() => undefined) },
              { icon: "✏️", label: "重命名", action: () => startRenameFile(fileMenuTarget) },
              {
                icon: "🏷️",
                label: "修改分类",
                action: () =>
                  setMoveModal({
                    fileId: fileMenuTarget.id,
                    bigId: fileMenuTarget.bigCategoryId,
                    categoryId: fileMenuTarget.categoryId,
                  }),
              },
              {
                icon: fileMenuTarget.isFavorite ? "⭐" : "☆",
                label: fileMenuTarget.isFavorite ? "取消收藏" : "收藏",
                action: () => toggleStar(fileMenuTarget.id).catch(() => undefined),
              },
            ].map((item) => (
              <div
                key={item.label}
                onClick={() => {
                  item.action();
                  setFileMenu(null);
                }}
                style={{
                  height: 32,
                  padding: "0 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  borderRadius: 7,
                  cursor: "pointer",
                  color: "#1D1D1F",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = "rgba(0,0,0,0.05)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = "transparent";
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
            <div style={{ height: 1, background: "rgba(0,0,0,0.07)", margin: "3px 0" }} />
            <div
              onClick={() => {
                setDeleteTarget({ fileId: fileMenuTarget.id, name: fileMenuTarget.name });
                setFileMenu(null);
              }}
              style={{
                height: 32,
                padding: "0 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                borderRadius: 7,
                cursor: "pointer",
                color: "#DC2626",
                transition: "background 0.1s",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = "rgba(239,68,68,0.07)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = "transparent";
              }}
            >
              <span>🗑️</span>
              <span>删除</span>
            </div>
          </div>
        </>
      ) : null}

      {catMenu && catMenuTarget ? (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 998 }} onClick={() => setCatMenu(null)} />
          <div
            style={{
              position: "fixed",
              left: Math.min(catMenu.x, window.innerWidth - 172),
              top: Math.min(catMenu.y, window.innerHeight - 140),
              background: "#fff",
              borderRadius: 10,
              border: "0.5px solid rgba(0,0,0,0.1)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              padding: 4,
              minWidth: 160,
              zIndex: 999,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              onClick={() => {
                setRenamingCat({ categoryId: catMenu.categoryId, value: catMenuTarget.child.name });
                setCatMenu(null);
              }}
              style={{
                height: 32,
                padding: "0 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                borderRadius: 7,
                cursor: "pointer",
                color: "#1D1D1F",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = "rgba(0,0,0,0.05)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = "transparent";
              }}
            >
              <span>✏️</span>
              <span>重命名分类</span>
            </div>
            <div
              onClick={() => {
                deleteCategory(catMenu.categoryId).catch(() => undefined);
                setCatMenu(null);
              }}
              style={{
                height: 32,
                padding: "0 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                borderRadius: 7,
                cursor: "pointer",
                color: (categoryCountMap.get(catMenu.categoryId) ?? 0) > 0 ? "#9CA3AF" : "#DC2626",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = "rgba(0,0,0,0.05)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = "transparent";
              }}
            >
              <span>🗑️</span>
              <span>删除分类</span>
            </div>
            {(categoryCountMap.get(catMenu.categoryId) ?? 0) > 0 ? (
              <div style={{ fontSize: 10, color: "#9CA3AF", padding: "2px 10px 4px" }}>请先移走所有文件</div>
            ) : null}
          </div>
        </>
      ) : null}

      {deleteTarget ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 24,
              width: 360,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>删除文件</div>
            <div style={{ fontSize: 13, color: "#86868B", lineHeight: 1.6, marginBottom: 20 }}>
              确定要删除「{deleteTarget.name}」？此操作不可恢复。
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                style={{
                  height: 32,
                  padding: "0 16px",
                  borderRadius: 8,
                  border: "0.5px solid rgba(0,0,0,0.1)",
                  background: "transparent",
                  color: "#86868B",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => deleteFile(deleteTarget.fileId).catch(() => undefined)}
                style={{
                  height: 32,
                  padding: "0 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#EF4444",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {moveModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setMoveModal(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 20,
              width: 320,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1D1D1F", marginBottom: 12 }}>移动到</div>
            <div style={{ display: "grid", gap: 8 }}>
              <select
                value={moveModal.bigId}
                onChange={(event) => {
                  const bigId = event.target.value as BigCategoryId;
                  const first = categories.find((group) => group.id === bigId)?.children[0];
                  setMoveModal((prev) =>
                    prev
                      ? { ...prev, bigId, categoryId: first?.id ?? prev.categoryId }
                      : prev,
                  );
                }}
                style={{
                  width: "100%",
                  height: 34,
                  borderRadius: 8,
                  border: "0.5px solid rgba(0,0,0,0.12)",
                  padding: "0 10px",
                  fontSize: 12,
                  outline: "none",
                }}
              >
                {categories.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <select
                value={moveModal.categoryId}
                onChange={(event) =>
                  setMoveModal((prev) => (prev ? { ...prev, categoryId: event.target.value } : prev))
                }
                style={{
                  width: "100%",
                  height: 34,
                  borderRadius: 8,
                  border: "0.5px solid rgba(0,0,0,0.12)",
                  padding: "0 10px",
                  fontSize: 12,
                  outline: "none",
                }}
              >
                {(categories.find((group) => group.id === moveModal.bigId)?.children ?? []).map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setMoveModal(null)}
                style={{
                  height: 32,
                  borderRadius: 8,
                  border: "0.5px solid rgba(0,0,0,0.1)",
                  background: "transparent",
                  color: "#86868B",
                  padding: "0 14px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => confirmMoveCategory().catch(() => undefined)}
                style={{
                  height: 32,
                  borderRadius: 8,
                  border: "none",
                  background: "#6366F1",
                  color: "#fff",
                  padding: "0 14px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {schoolModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setSchoolModal(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 20,
              width: 320,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1D1D1F", marginBottom: 12 }}>修改关联学校</div>
            <input
              autoFocus
              value={schoolModal.value}
              onChange={(event) =>
                setSchoolModal((prev) => (prev ? { ...prev, value: event.target.value } : prev))
              }
              placeholder="例如 Columbia / MIT"
              style={{
                width: "100%",
                height: 34,
                borderRadius: 8,
                border: "0.5px solid rgba(0,0,0,0.12)",
                padding: "0 10px",
                fontSize: 12,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setSchoolModal(null)}
                style={{
                  height: 32,
                  borderRadius: 8,
                  border: "0.5px solid rgba(0,0,0,0.1)",
                  background: "transparent",
                  color: "#86868B",
                  padding: "0 14px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => confirmSchool().catch(() => undefined)}
                style={{
                  height: 32,
                  borderRadius: 8,
                  border: "none",
                  background: "#6366F1",
                  color: "#fff",
                  padding: "0 14px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {newFolder.open ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setNewFolder((prev) => ({ ...prev, open: false }))}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 20,
              width: 320,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1D1D1F", marginBottom: 12 }}>新建文件夹</div>
            <div style={{ display: "grid", gap: 8 }}>
              <select
                value={newFolder.bigId}
                onChange={(event) =>
                  setNewFolder((prev) => ({ ...prev, bigId: event.target.value as BigCategoryId }))
                }
                style={{
                  width: "100%",
                  height: 34,
                  borderRadius: 8,
                  border: "0.5px solid rgba(0,0,0,0.12)",
                  padding: "0 10px",
                  fontSize: 12,
                  outline: "none",
                }}
              >
                {categories.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <input
                value={newFolder.name}
                onChange={(event) => setNewFolder((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="文件夹名称"
                style={{
                  width: "100%",
                  height: 34,
                  borderRadius: 8,
                  border: "0.5px solid rgba(0,0,0,0.12)",
                  padding: "0 10px",
                  fontSize: 12,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setNewFolder((prev) => ({ ...prev, open: false }))}
                style={{
                  height: 32,
                  borderRadius: 8,
                  border: "0.5px solid rgba(0,0,0,0.1)",
                  background: "transparent",
                  color: "#86868B",
                  padding: "0 14px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => createFolderFromToolbar().catch(() => undefined)}
                style={{
                  height: 32,
                  borderRadius: 8,
                  border: "none",
                  background: "#6366F1",
                  color: "#fff",
                  padding: "0 14px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div
          style={{
            position: "fixed",
            right: 16,
            bottom: 14,
            zIndex: 1200,
            borderRadius: 10,
            background: "rgba(255,255,255,0.92)",
            border: "0.5px solid rgba(0,0,0,0.1)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            padding: "8px 12px",
            fontSize: 12,
            color: "#374151",
            maxWidth: 420,
          }}
        >
          {notice}
        </div>
      ) : null}
    </section>
  );
}
