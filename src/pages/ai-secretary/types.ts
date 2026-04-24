export type MsgFrom = "ai" | "user" | "feishu";
export type MainTab = "chat" | "briefing";

export interface ToolCallRecord {
  tool: string;
  desc: string;
  result: string;
}

export interface Message {
  id: number;
  from: MsgFrom;
  text: string;
  time: string;
  toolCall?: ToolCallRecord;
  subText?: string;
  isLoading?: boolean;
}

export interface HistItem {
  id: number;
  title: string;
  preview: string;
  time: string;
  type: "chat" | "briefing";
  fromFeishu?: boolean;
  briefingType?: "morning" | "evening";
  sent?: boolean;
}

export interface BriefingTask {
  label: string;
  tag: string;
  tagColor: string;
  done?: boolean;
}

export interface BriefingAlert {
  icon: string;
  text: string;
  urgency: "high" | "medium" | "low";
}

export interface BriefingNews {
  category: string;
  source: string;
  text: string;
}

export interface SecretaryTool {
  name: string;
  description: string;
  params?: Record<string, string>;
}
