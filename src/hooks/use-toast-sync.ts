import { useEffect } from "react";
import { useUiStore } from "@/stores/ui-store";

type ToastSyncParams = {
  message: string | null;
  error: string | null;
  clearMessage?: () => void;
  clearError?: () => void;
};

export function useToastSync({
  message,
  error,
  clearMessage,
  clearError,
}: ToastSyncParams) {
  const pushToast = useUiStore((state) => state.pushToast);

  useEffect(() => {
    if (!message) return;
    pushToast({ title: message, tone: "success" });
    clearMessage?.();
  }, [clearMessage, message, pushToast]);

  useEffect(() => {
    if (!error) return;
    pushToast({ title: "操作失败", description: error, tone: "error" });
    clearError?.();
  }, [clearError, error, pushToast]);
}
