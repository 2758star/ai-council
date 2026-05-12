import {
  BriefcaseBusiness,
  BookMarked,
  BookX,
  FileText,
  ClipboardCheck,
  Gauge,
  Settings2,
  Bot,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createElement, type ComponentType } from "react";
import type { AppRoute } from "@/stores/ui-store";

const QuestionBankIcon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }> = ({
  size = 17,
  className,
}) =>
  createElement(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 20 20",
      fill: "none",
      className,
      "aria-hidden": true,
    },
    createElement("path", {
      d: "M3 5h6v11H3zM11 5h6v11h-6z",
      stroke: "currentColor",
      strokeWidth: "1.4",
      strokeLinejoin: "round",
    }),
    createElement("path", {
      d: "M9 5h2",
      stroke: "currentColor",
      strokeWidth: "1.4",
      strokeLinecap: "round",
    })
  );

export type RouteItem = {
  key: AppRoute;
  label: string;
  description: string;
  icon: LucideIcon | ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

export const routeItems: RouteItem[] = [
  { key: "dashboard", label: "总览", description: "只读指挥台与计划依据", icon: Gauge },
  { key: "tasks", label: "任务", description: "今日下一步与推进执行", icon: ClipboardCheck },
  { key: "applications", label: "申请管理", description: "学校、项目与材料状态", icon: BriefcaseBusiness },
  { key: "mistakes", label: "错题本", description: "错题归档与回顾", icon: BookX },
  { key: "daily-log", label: "每日学习日志", description: "学习记录与复盘", icon: FileText },
  { key: "library", label: "资料库", description: "学习资料与参考文件", icon: BookMarked },
  { key: "question-bank", label: "题库", description: "题库首页与做题入口", icon: QuestionBankIcon },
  { key: "briefing", label: "AI秘书", description: "对话与简报中心", icon: Bot },
  { key: "ai", label: "AI议会", description: "多模型群聊与方案会审", icon: Sparkles },
  { key: "settings", label: "设置", description: "主题与集成配置", icon: Settings2 },
];

export const hiddenRouteItems: RouteItem[] = [
  { key: "question-bank-list", label: "题库列表", description: "Passage 列表与筛选", icon: QuestionBankIcon },
  { key: "question-bank-exam", label: "题库做题", description: "深色机考做题界面", icon: BookX },
];
