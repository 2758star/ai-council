import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";

export type ModuleState = "loading" | "success" | "error" | "fallback";

const stateTextMap: Record<ModuleState, string> = {
  loading: "加载中",
  success: "已连接",
  error: "异常",
  fallback: "已降级",
};

const stateIconMap = {
  loading: Loader2,
  success: CheckCircle2,
  error: AlertCircle,
  fallback: Info,
} as const;

export function ModuleStateStrip({ state, text }: { state: ModuleState; text?: string }) {
  const Icon = stateIconMap[state];
  return (
    <span className={`state-strip ${state}`}>
      <Icon size={11} className={state === "loading" ? "animate-spin" : ""} />
      {text ?? stateTextMap[state]}
    </span>
  );
}

