import { invoke } from "@tauri-apps/api/core";

export type AppBootstrap = {
  appName: string;
  databasePath: string;
  initializedAt: string;
};

export async function initializeDatabase() {
  return invoke<AppBootstrap>("initialize_database");
}

