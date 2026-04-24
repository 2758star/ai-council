export type WritePermissionMode = "read-only" | "draft-write" | "commit-write";
export type ToolPermissionLevel = "read" | "draft" | "commit";

export class WritePolicy {
  constructor(private readonly mode: WritePermissionMode = "draft-write") {}

  canExecute(level: ToolPermissionLevel, confirmed = false) {
    if (this.mode === "commit-write") {
      return level !== "commit" || confirmed;
    }
    if (this.mode === "draft-write") {
      return level === "read" || level === "draft";
    }
    return level === "read";
  }

  get currentMode() {
    return this.mode;
  }
}
