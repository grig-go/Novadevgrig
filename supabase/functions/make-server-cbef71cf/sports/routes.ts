// supabase/functions/make-server-cbef71cf/sports/routes.ts
import type { Context } from "npm:hono";

export const sportsRoutes = {
  async getTeams(c: Context, _cfg: any) {
    return c.json({ ok: false, error: "SPORTS_NOT_CONFIGURED" }, 501);
  },
  async getStandings(c: Context, _cfg: any) {
    return c.json({ ok: false, error: "SPORTS_NOT_CONFIGURED" }, 501);
  },
  async getSeasons(c: Context, _cfg: any) {
    return c.json({ ok: false, error: "SPORTS_NOT_CONFIGURED" }, 501);
  },
};
