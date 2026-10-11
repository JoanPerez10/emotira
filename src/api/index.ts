import { mockApi } from "./mockApi";
import { supabaseApi } from "./supabaseApi";
import type { Api } from "./types";

// El mock té prioritat: si VITE_DATA_MODE=mock, mai es toca Supabase
export const api: Api =
  import.meta.env.VITE_DATA_MODE === "mock" ? mockApi : supabaseApi;

export const isMock = api.mode === "mock";