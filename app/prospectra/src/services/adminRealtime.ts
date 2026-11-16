import { getSupabaseClient } from "../config/supabaseClient";
import { TABLES } from "../constants/tables";

export interface AdminRealtimeCallbacks {
  onApprovalsChange?: () => void;
  onInvitesChange?: () => void;
  onMembersChange?: () => void;
  onActivityChange?: () => void;
  onAnyChange?: () => void;
}

/**
 * Subscribes to realtime Postgres changes for organization approvals,
 * invites, members, and activity events scoped to the given orgId.
 *
 * Uses a debounce timer to avoid rapid successive refetches.
 */
export function subscribeToOrgAdminRealtime(
  orgId: string,
  callbacks: AdminRealtimeCallbacks,
): () => void {
  if (!orgId) {
    return () => {};
  }

  const supabase = getSupabaseClient();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const triggerDebounced = (specificCb?: () => void) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      try {
        if (specificCb) {
          specificCb();
        }
        if (callbacks.onAnyChange) {
          callbacks.onAnyChange();
        }
      } catch (err) {
        console.warn("[adminRealtime] Callback error:", err);
      }
    }, 300);
  };

  const channelName = `org_admin_realtime_${orgId}_${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TABLES.ORG_APPROVALS,
      },
      (payload: any) => {
        const row: any = payload.eventType === "DELETE" ? payload.old : payload.new;
        if (!row || row.org_id === orgId) {
          triggerDebounced(callbacks.onApprovalsChange);
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TABLES.ORGANIZATION_INVITES,
      },
      (payload: any) => {
        const row: any = payload.eventType === "DELETE" ? payload.old : payload.new;
        if (!row || row.org_id === orgId) {
          triggerDebounced(callbacks.onInvitesChange);
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TABLES.ORGANIZATION_MEMBERS,
      },
      (payload: any) => {
        const row: any = payload.eventType === "DELETE" ? payload.old : payload.new;
        if (!row || row.organization_id === orgId) {
          triggerDebounced(callbacks.onMembersChange);
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: TABLES.ORG_ACTIVITY_EVENTS,
      },
      (payload: any) => {
        const row: any = payload.new;
        if (!row || row.org_id === orgId) {
          triggerDebounced(callbacks.onActivityChange);
        }
      },
    )
    .subscribe((status: any, err?: any) => {
      if (status === "CHANNEL_ERROR") {
        console.warn("[adminRealtime] Channel error:", err?.message || err);
      }
    });

  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    supabase.removeChannel(channel);
  };
}
