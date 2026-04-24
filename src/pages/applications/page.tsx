import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-shell";
import { listProjects } from "@/features/applications/api";

type Status = "进行中" | "紧急" | "准备中" | "已提交" | "待开始" | "追踪中";
type MaterialState = "done" | "editing" | "todo";

type TimelineNode = {
  date: string;
  title: string;
  status: "done" | "current" | "upcoming" | "in-progress";
};

type Referee = {
  id: string;
  name: string;
  status: "已提交" | "等待中";
  checked: boolean;
};

type School = {
  id: number;
  name: string;
  chineseName: string;
  program: string;
  country: string;
  countryColor: string;
  countryBg: string;
  status: Status;
  deadline: number;
  progress: number;
  color: string;
  officialUrl: string;
  timeline: TimelineNode[];
};

type MaterialItem = {
  id: string;
  name: string;
  state: MaterialState;
};

const statusPill: Record<Status, string> = {
  进行中: "bg-[#EEF2FF] text-[#6366F1]",
  紧急: "bg-[#FEF2F2] text-[#DC2626]",
  准备中: "bg-[#FFFBEB] text-[#B45309]",
  已提交: "bg-[#ECFDF5] text-[#059669]",
  待开始: "bg-[#F3F4F6] text-[#6B7280]",
  追踪中: "bg-[#EEF2FF] text-[#4338CA]",
};

const materialStatePill: Record<MaterialState, string> = {
  done: "bg-[#ECFDF5] text-[#059669]",
  editing: "bg-[#FFFBEB] text-[#B45309]",
  todo: "bg-[#F3F4F6] text-[#6B7280]",
};

const materialStateText: Record<MaterialState, string> = {
  done: "完成",
  editing: "修改中",
  todo: "待完成",
};

const timelineDotClass: Record<TimelineNode["status"], string> = {
  done: "bg-[#10B981] border-[#10B981]",
  current: "bg-[#6366F1] border-[#6366F1]",
  upcoming: "bg-transparent border-[#D1D1D6]",
  "in-progress": "bg-[#F59E0B] border-[#F59E0B]",
};

const schoolData: School[] = [
  
];

const schoolMeta: Record<
  string,
  { chineseName: string; country: string; countryColor: string; countryBg: string; url: string }
> = {
  HKUST: {
    chineseName: "香港科技大学",
    country: "香港",
    countryColor: "#EF4444",
    countryBg: "#FEF2F2",
    url: "https://mscmark.hkust.edu.hk",
  },
  HKU: {
    chineseName: "香港大学",
    country: "香港",
    countryColor: "#EF4444",
    countryBg: "#FEF2F2",
    url: "https://masters.hkubs.hku.hk",
  },
  CUHK: {
    chineseName: "香港中文大学",
    country: "香港",
    countryColor: "#EF4444",
    countryBg: "#FEF2F2",
    url: "https://www.gs.cuhk.edu.hk/admissions/admissions/application-deadline",
  },
  NUS: {
    chineseName: "新加坡国立大学",
    country: "新加坡",
    countryColor: "#F59E0B",
    countryBg: "#FFFBEB",
    url: "https://mscmarketing.nus.edu.sg",
  },
  NTU: {
    chineseName: "南洋理工大学",
    country: "新加坡",
    countryColor: "#F59E0B",
    countryBg: "#FFFBEB",
    url: "https://www.ntu.edu.sg/business/admissions/graduate-studies/msc-marketing-science",
  },
  LSE: {
    chineseName: "伦敦政治经济学院",
    country: "英国",
    countryColor: "#6366F1",
    countryBg: "#EEF2FF",
    url: "https://www.lse.ac.uk/study-at-lse/Graduate/Available-programmes",
  },
  "Imperial College London": {
    chineseName: "帝国理工学院",
    country: "英国",
    countryColor: "#6366F1",
    countryBg: "#EEF2FF",
    url: "https://www.imperial.ac.uk/business-school/programmes/masters",
  },
  "University of Melbourne": {
    chineseName: "墨尔本大学",
    country: "澳大利亚",
    countryColor: "#10B981",
    countryBg: "#ECFDF5",
    url: "https://study.unimelb.edu.au/find/courses/graduate/master-of-management-marketing",
  },
  "University of Sydney": {
    chineseName: "悉尼大学",
    country: "澳大利亚",
    countryColor: "#10B981",
    countryBg: "#ECFDF5",
    url: "https://www.sydney.edu.au/courses/courses/pc/master-of-marketing.html",
  },
};

const defaultMaterials: MaterialItem[] = [
  { id: "ps", name: "个人陈述 PS", state: "done" },
  { id: "transcript", name: "成绩单", state: "done" },
  { id: "ielts", name: "语言成绩 IELTS", state: "done" },
  { id: "cv", name: "CV / Resume", state: "done" },
  { id: "writing", name: "Writing Sample", state: "editing" },
  { id: "fee", name: "申请费支付", state: "todo" },
  { id: "submit", name: "网申系统提交", state: "todo" },
];

const defaultReferees: Referee[] = [
  { id: "zhang", name: "Prof. Zhang", status: "已提交", checked: true },
  { id: "li", name: "Prof. Li", status: "已提交", checked: true },
  { id: "wang", name: "Prof. Wang", status: "等待中", checked: false },
];

function countdownColor(s: School) {
  if (s.status === "已提交") return "#059669";
  if (s.deadline <= 7) return "#EF4444";
  if (s.deadline <= 30) return "#F59E0B";
  return "#86868B";
}

function deadlineLabel(s: School) {
  if (s.status === "已提交") return "✓";
  return `${s.deadline}天`;
}

function MaterialCheckbox({ state }: { state: MaterialState }) {
  if (state === "done") {
    return (
      <span className="grid h-[14px] w-[14px] place-items-center rounded-[4px] bg-[#10B981]">
        <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
          <path d="M3 6.4L5.2 8.6L9 4.8" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  if (state === "editing") {
    return <span className="h-[14px] w-[14px] rounded-[4px] bg-[#F59E0B]" />;
  }

  return <span className="h-[14px] w-[14px] rounded-[4px] border-[1.5px] border-[#D1D1D6]" />;
}

export function ApplicationsPage() {
  const [schools, setSchools] = useState<School[]>(schoolData);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [expandRefs, setExpandRefs] = useState(true);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [referees, setReferees] = useState<Referee[]>(defaultReferees);
  const [form, setForm] = useState({
    name: "",
    program: "",
    degree: "硕士",
    deadline: "",
    status: "待开始" as Status,
    url: "",
  });

  const filteredSchools = useMemo(
    () =>
      schools.filter((s) => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return true;
        return (
          s.name.toLowerCase().includes(keyword) ||
          s.program.toLowerCase().includes(keyword) ||
          s.chineseName.includes(search.trim()) ||
          s.country.includes(search.trim())
        );
      }),
    [schools, search]
  );

  const activeSchool = useMemo(() => schools.find((s) => s.id === selectedId) ?? schools[0] ?? null, [schools, selectedId]);

  useEffect(() => {
    async function loadFromDb() {
      try {
        const rows = await listProjects();
        const today = new Date();
        const mapped: School[] = rows.map((item, index) => {
          const meta = schoolMeta[item.schoolName] ?? {
            chineseName: item.schoolName,
            country: item.country ?? "未知",
            countryColor: item.countryColor ?? "#6B7280",
            countryBg: "#F3F4F6",
            url: item.officialUrl ?? "",
          };
          const country = item.country ?? meta.country;
          const countryColor = item.countryColor ?? meta.countryColor;
          const countryBg =
            country === "香港"
              ? "#FEF2F2"
              : country === "新加坡"
              ? "#FFFBEB"
              : country === "英国"
              ? "#EEF2FF"
              : "#ECFDF5";
          const deadlineDate = item.deadline ? new Date(item.deadline) : null;
          const deadline = deadlineDate
            ? Math.max(0, Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
          return {
            id: item.id,
            name: item.schoolName,
            chineseName: item.chineseName ?? meta.chineseName,
            program: item.programName,
            country,
            countryColor,
            countryBg,
            status: (item.status as Status) ?? "追踪中",
            deadline,
            progress: item.status === "完成" ? 100 : item.status === "已提交" ? 80 : 20,
            color: ["#6366F1", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"][index % 5],
            officialUrl: item.officialUrl ?? meta.url ?? "",
            timeline: [
              { date: item.createdAt.slice(0, 10), title: "已创建追踪", status: "done" },
              { date: item.deadline ?? "待定", title: "申请截止日", status: "current" },
            ],
          };
        });
        setSchools(mapped);
        setSelectedId(mapped[0]?.id ?? null);
      } catch {
        setSchools([]);
        setSelectedId(null);
      }
    }
    loadFromDb().catch(() => undefined);
  }, []);

  const materialDoneCount = defaultMaterials.filter((m) => m.state === "done").length;
  const refDoneCount = referees.filter((r) => r.checked).length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        position: "fixed",
        inset: "38px 0 32px 52px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#F5F5F7",
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden", minHeight: 0 }}>
        <aside
          style={{
            width: 220,
            flexShrink: 0,
            borderRight: "1px solid rgba(0,0,0,0.06)",
            background: "rgba(255,255,255,0.45)",
            display: "flex",
            flexDirection: "column",
            padding: "12px 8px",
            gap: 5,
            overflowY: "auto",
          }}
        >
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[13px] font-semibold text-[#1D1D1F]">申请学校</h2>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setOpenAdd(true)}
              style={{ width: 22, height: 22, borderRadius: 6, background: "#6366F1" }}
              className="grid place-items-center text-white"
            >
              <Plus size={13} />
            </motion.button>
          </div>

          <div className="relative px-1">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索学校…"
              style={{ background: "rgba(0,0,0,0.05)", borderRadius: 8, height: 28 }}
              className="w-full border-none pl-8 pr-2 text-[11px] text-[#1D1D1F] outline-none placeholder:text-[#9CA3AF]"
            />
          </div>

          <div className="space-y-[5px] px-1">
            {filteredSchools.length === 0 ? (
              <div className="rounded-[8px] bg-white/70 px-2 py-3 text-[11px] text-[#86868B]">
                还没有申请学校，点击 + 添加
              </div>
            ) : null}
            {filteredSchools.map((s) => {
              const selected = s.id === activeSchool?.id;
              return (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  style={{
                    borderRadius: 10,
                    padding: "9px 10px",
                    cursor: "pointer",
                    background: selected ? "rgba(255,255,255,0.9)" : "transparent",
                    border: selected ? "1px solid rgba(99,102,241,0.2)" : "1px solid transparent",
                    boxShadow: selected ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                  }}
                  className="w-full text-left transition-colors hover:bg-[rgba(255,255,255,0.7)]"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-[#1D1D1F]">{s.name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-[#86868B]">{s.chineseName}</p>
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        padding: "2px 7px",
                        borderRadius: 99,
                        background: s.countryBg,
                        color: s.countryColor,
                        flexShrink: 0,
                      }}
                    >
                      {s.country}
                    </span>
                  </div>
                  <p className="truncate text-[10px] text-[#86868B]">{s.program}</p>

                  <div className="mt-2 h-[3px] rounded-[99px] bg-[rgba(0,0,0,0.07)]">
                    <div className="h-[3px] rounded-[99px]" style={{ width: `${Math.min(100, Math.max(0, s.progress))}%`, background: s.color }} />
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${statusPill[s.status]}`}>{s.status}</span>
                    <span style={{ color: countdownColor(s) }} className="text-[11px] font-semibold">
                      {deadlineLabel(s)}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </aside>

        <main
          style={{
            flex: 1,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 9,
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {!activeSchool ? (
            <section className="gc flex h-full items-center justify-center p-3 text-[13px] text-[#86868B]">
              还没有申请学校，点击左上角 + 添加
            </section>
          ) : (
            <>
          <section className="gc flex items-start justify-between p-3">
            <div>
              <h1 className="text-[18px] font-bold text-[#1D1D1F]">{activeSchool.name}</h1>
              <p className="mt-0.5 text-[10px] text-[#86868B]">{activeSchool.chineseName}</p>
              <p className="mt-0.5 text-[12px] text-[#86868B]">{activeSchool.program}</p>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => {
                  if (activeSchool.officialUrl) {
                    open(activeSchool.officialUrl).catch(() => undefined);
                  }
                }}
                disabled={!activeSchool.officialUrl}
                className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-[rgba(0,0,0,0.12)] px-3 text-[11px]"
                style={{
                  background: activeSchool.officialUrl ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.04)",
                  color: activeSchool.officialUrl ? "#1D1D1F" : "#C7C7CC",
                  cursor: activeSchool.officialUrl ? "pointer" : "not-allowed",
                }}
              >
                <ExternalLink size={12} />官网
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} className="h-8 rounded-[8px] bg-[#6366F1] px-3 text-[11px] font-medium text-white">
                新建任务
              </motion.button>
            </div>
          </section>

          <section className="grid grid-cols-4 gap-2">
            <div className="gc p-3" style={{ background: "rgba(99,102,241,0.07)" }}>
              <p className="text-[11px] text-[#86868B]">截止倒计时</p>
              <p className="mt-1 text-[22px] font-bold text-[#6366F1]">47</p>
              <p className="text-[10px] text-[#86868B]">天后 · 12月1日</p>
            </div>
            <div className="gc p-3" style={{ background: "rgba(16,185,129,0.07)" }}>
              <p className="text-[11px] text-[#86868B]">材料完成</p>
              <p className="mt-1 text-[22px] font-bold text-[#059669]">6/8</p>
              <p className="text-[10px] text-[#86868B]">75% 完成</p>
            </div>
            <div className="gc p-3" style={{ background: "rgba(245,158,11,0.07)" }}>
              <p className="text-[11px] text-[#86868B]">关联任务</p>
              <p className="mt-1 text-[22px] font-bold text-[#B45309]">3</p>
              <p className="text-[10px] text-[#86868B]">待完成</p>
            </div>
            <div className="gc p-3" style={{ background: "rgba(0,0,0,0.03)" }}>
              <p className="text-[11px] text-[#86868B]">GPA要求</p>
              <p className="mt-1 text-[22px] font-bold text-[#1D1D1F]">3.5+</p>
              <p className="text-[10px] text-[#86868B]">你的 GPA 3.8 ✓</p>
            </div>
          </section>

          <section className="grid min-h-0 flex-1 grid-cols-3 gap-[10px]">
            <article className="gc min-h-0 overflow-y-auto p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-[#1D1D1F]">材料清单</h3>
                <button className="text-[11px] font-medium text-[#6366F1]">+ 添加</button>
              </div>

              <div className="space-y-1.5">
                {defaultMaterials.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-[7px] px-2 py-1.5">
                    <MaterialCheckbox state={item.state} />
                    <p className="min-w-0 flex-1 text-[11px] text-[#1D1D1F]">{item.name}</p>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${materialStatePill[item.state]}`}>{materialStateText[item.state]}</span>
                  </div>
                ))}

                <div className="rounded-[7px] border border-[rgba(0,0,0,0.06)] px-2 py-1.5">
                  <button onClick={() => setExpandRefs((p) => !p)} className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MaterialCheckbox state={refDoneCount >= 2 ? "editing" : "todo"} />
                      <p className="text-[11px] text-[#1D1D1F]">推荐信</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#EEF2FF] px-1.5 py-0.5 text-[9px] text-[#6366F1]">{refDoneCount}/3</span>
                      <ChevronDown className={`h-3.5 w-3.5 text-[#86868B] transition-transform ${expandRefs ? "rotate-0" : "-rotate-90"}`} />
                    </div>
                  </button>
                  <AnimatePresence initial={false}>
                    {expandRefs ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 space-y-1 overflow-hidden"
                      >
                        {referees.map((ref) => (
                          <button
                            key={ref.id}
                            onClick={() =>
                              setReferees((prev) =>
                                prev.map((p) => (p.id === ref.id ? { ...p, checked: !p.checked, status: !p.checked ? "已提交" : "等待中" } : p))
                              )
                            }
                            className="flex w-full items-center gap-2 rounded-[6px] px-1.5 py-1 text-left"
                          >
                            <span className={`grid h-[12px] w-[12px] place-items-center rounded-[3px] ${ref.checked ? "bg-[#10B981]" : "border border-[#D1D1D6]"}`}>
                              {ref.checked ? (
                                <svg width="7" height="7" viewBox="0 0 12 12" fill="none">
                                  <path d="M3 6.4L5.2 8.6L9 4.8" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              ) : null}
                            </span>
                            <span className="text-[10px] text-[#1D1D1F]">{ref.name}</span>
                            <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] ${ref.status === "已提交" ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#F3F4F6] text-[#6B7280]"}`}>
                              {ref.status}
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <p className="pt-1 text-[9px] text-[#86868B]">已完成 {materialDoneCount}/7 项基础材料，推荐信 {refDoneCount}/3。</p>
              </div>
            </article>

            <article className="gc min-h-0 overflow-y-auto p-3">
              <h3 className="mb-2 text-[13px] font-semibold text-[#1D1D1F]">申请时间线</h3>
              <div className="space-y-1.5">
                {activeSchool.timeline.map((node, idx) => (
                  <div key={`${node.date}-${node.title}`} className="flex gap-[10px]">
                    <div className="flex min-h-[40px] w-3 flex-col items-center">
                      {node.status === "current" ? (
                        <motion.span
                          animate={{ opacity: [1, 0.4, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className={`mt-[3px] h-2 w-2 rounded-full border-2 ${timelineDotClass[node.status]}`}
                        />
                      ) : (
                        <span className={`mt-[3px] h-2 w-2 rounded-full border-2 ${timelineDotClass[node.status]}`} />
                      )}
                      {idx < activeSchool.timeline.length - 1 ? <span className="mt-1 w-px flex-1 bg-[rgba(0,0,0,0.08)]" /> : null}
                    </div>
                    <div className="pb-1">
                      <p className="text-[9px] text-[#86868B]">{node.date}</p>
                      <p className="text-[11px] text-[#1D1D1F]">{node.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="gc min-h-0 overflow-y-auto p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-[#1D1D1F]">官网信息</h3>
                <span className="rounded-full bg-[#ECFDF5] px-1.5 py-0.5 text-[9px] text-[#059669]">已同步</span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                {[
                  ["截止日期", "Dec 1, 2026"],
                  ["语言要求", "IELTS 7.0+"],
                  ["GPA要求", "3.5 / 4.0"],
                  ["申请费", "$85"],
                  ["申请系统", "ColumbiaApp"],
                  ["上次更新", "2小时前"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center">
                    <span className="w-[68px] text-[#9CA3AF]">{k}</span>
                    <span className="text-[#1D1D1F]">{v}</span>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex items-center justify-between rounded-[8px] border border-[rgba(16,185,129,0.15)] bg-[rgba(16,185,129,0.06)] px-2 py-1.5">
                <div className="flex items-center gap-1.5 text-[10px] text-[#059669]">
                  <motion.span
                    animate={{ opacity: [1, 0.35, 1], scale: [1, 1.12, 1] }}
                    transition={{ repeat: Infinity, duration: 1.6 }}
                    className="h-2 w-2 rounded-full bg-[#10B981]"
                  />
                  自动监控中 · 每8小时
                </div>
                <span className="text-[10px] text-[#86868B]">下次 06:00</span>
              </div>

              <button onClick={() => setMonitorOpen((p) => !p)} className="mt-2 flex w-full items-center justify-between rounded-[8px] bg-[rgba(0,0,0,0.04)] px-2 py-1.5 text-[11px] text-[#4B5563]">
                监控设置
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${monitorOpen ? "rotate-0" : "-rotate-90"}`} />
              </button>

              <AnimatePresence initial={false}>
                {monitorOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-2 space-y-2 overflow-hidden"
                  >
                    <input
                      defaultValue={activeSchool.officialUrl}
                      className="h-8 w-full rounded-[8px] border border-[rgba(0,0,0,0.08)] bg-white px-2 text-[11px] text-[#1D1D1F] outline-none"
                    />
                    <motion.button whileTap={{ scale: 0.97 }} className="h-8 rounded-[8px] bg-[#EEF2FF] px-3 text-[11px] font-medium text-[#6366F1]">
                      立即重新抓取
                    </motion.button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </article>
          </section>
            </>
          )}
        </main>
      </div>

      <AnimatePresence>
        {openAdd ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center"
            style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="w-[480px] rounded-[16px] bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-[#1D1D1F]">添加申请学校</h2>
                <button onClick={() => setOpenAdd(false)} className="grid h-6 w-6 place-items-center rounded-md text-[#86868B] hover:bg-zinc-100">
                  <X size={14} />
                </button>
              </div>

              <div className="grid gap-2">
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="学校名称"
                  className="h-9 rounded-[9px] border border-[rgba(0,0,0,0.08)] px-3 text-[12px] outline-none focus:border-[rgba(99,102,241,0.35)]"
                />
                <input
                  value={form.program}
                  onChange={(e) => setForm((p) => ({ ...p, program: e.target.value }))}
                  placeholder="项目名称"
                  className="h-9 rounded-[9px] border border-[rgba(0,0,0,0.08)] px-3 text-[12px] outline-none focus:border-[rgba(99,102,241,0.35)]"
                />
                <select
                  value={form.degree}
                  onChange={(e) => setForm((p) => ({ ...p, degree: e.target.value }))}
                  className="h-9 rounded-[9px] border border-[rgba(0,0,0,0.08)] px-3 text-[12px] outline-none focus:border-[rgba(99,102,241,0.35)]"
                >
                  <option>硕士</option>
                  <option>博士</option>
                  <option>本科</option>
                </select>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                  className="h-9 rounded-[9px] border border-[rgba(0,0,0,0.08)] px-3 text-[12px] outline-none focus:border-[rgba(99,102,241,0.35)]"
                />
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as Status }))}
                  className="h-9 rounded-[9px] border border-[rgba(0,0,0,0.08)] px-3 text-[12px] outline-none focus:border-[rgba(99,102,241,0.35)]"
                >
                  <option>待开始</option>
                  <option>准备中</option>
                  <option>进行中</option>
                  <option>紧急</option>
                  <option>已提交</option>
                </select>
                <input
                  value={form.url}
                  onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://..."
                  className="h-9 rounded-[9px] border border-[rgba(0,0,0,0.08)] px-3 text-[12px] outline-none focus:border-[rgba(99,102,241,0.35)]"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setOpenAdd(false)} className="h-9 rounded-[9px] bg-zinc-100 px-4 text-[12px] text-[#4B5563]">
                  取消
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    const id = Date.now();
                    const today = new Date();
                    const ddl = form.deadline ? new Date(form.deadline) : today;
                    const days = Math.max(0, Math.ceil((ddl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
                    const meta = schoolMeta[form.name || ""] ?? {
                      chineseName: form.name || "未填写",
                      country: "未知",
                      countryColor: "#6B7280",
                      countryBg: "#F3F4F6",
                      url: form.url || "https://example.com",
                    };
                    const next: School = {
                      id,
                      name: form.name || "New School",
                      chineseName: meta.chineseName,
                      program: form.program || `${form.degree} 项目`,
                      country: meta.country,
                      countryColor: meta.countryColor,
                      countryBg: meta.countryBg,
                      status: form.status,
                      deadline: form.status === "已提交" ? 0 : days,
                      progress: form.status === "已提交" ? 100 : form.status === "进行中" ? 60 : form.status === "准备中" ? 35 : form.status === "紧急" ? 70 : 15,
                      color:
                        form.status === "进行中"
                          ? "#6366F1"
                          : form.status === "紧急"
                            ? "#EF4444"
                            : form.status === "准备中"
                              ? "#F59E0B"
                              : form.status === "已提交"
                                ? "#10B981"
                                : "#86868B",
                      officialUrl: form.url || meta.url,
                      timeline: [
                        { date: "2026/10", title: "创建申请条目", status: "done" },
                        { date: "2026/11", title: "材料准备", status: "current" },
                        { date: "2026/12", title: "网申提交", status: "upcoming" },
                      ],
                    };

                    setSchools((prev) => [next, ...prev]);
                    setSelectedId(id);
                    setOpenAdd(false);
                    setForm({ name: "", program: "", degree: "硕士", deadline: "", status: "待开始", url: "" });
                  }}
                  className="h-9 rounded-[9px] bg-[#6366F1] px-4 text-[12px] font-medium text-white"
                >
                  添加
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}
