import { useCallback, useEffect, useRef, useState } from "react";

import { adminService } from "@/services/adminService";
import { subscribeToOrgAdminRealtime } from "@/services/adminRealtime";
import type {
  ActorContext,
  AdminActionResult,
  OrgApproval,
  OrgInvite,
  OrgMember,
  OrgRole,
} from "@/types/admin";

export interface UseAdminState {
  actor: ActorContext | null;
  members: OrgMember[];
  invites: OrgInvite[];
  approvals: OrgApproval[];
  myRequests: OrgApproval[];
  loading: boolean;
  refreshing: boolean;
  actionInProgress: string | null;
  error: string | null;
  loadAll: () => Promise<void>;
  refresh: () => Promise<void>;
  inviteMember: (email: string) => Promise<AdminActionResult>;
  changeRole: (userId: string, newRole: OrgRole) => Promise<AdminActionResult>;
  removeMember: (userId: string) => Promise<AdminActionResult>;
  revokeInvite: (inviteId: string) => Promise<AdminActionResult>;
  decideApproval: (approvalId: string, decision: "approve" | "reject") => Promise<AdminActionResult>;
}

export function useAdmin(): UseAdminState {
  const [actor, setActor] = useState<ActorContext | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [approvals, setApprovals] = useState<OrgApproval[]>([]);
  const [myRequests, setMyRequests] = useState<OrgApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actorRef = useRef<ActorContext | null>(null);
  actorRef.current = actor;

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const currentActor = await adminService.fetchActorContext();
      setActor(currentActor);

      if (!currentActor.is_founder) {
        throw new Error("Admin access is restricted to organization founders.");
      }

      // Concurrently fetch members, pending invites, and role change requests
      const fetchPromises: Promise<any>[] = [
        adminService.fetchMembers(),
        adminService.fetchPendingInvites(),
      ];

      if (currentActor.is_owner) {
        fetchPromises.push(adminService.fetchApprovals());
      } else {
        fetchPromises.push(adminService.fetchMyRequests());
      }

      const results = await Promise.all(fetchPromises);
      setMembers(results[0] || []);
      setInvites(results[1] || []);

      if (currentActor.is_owner) {
        setApprovals(results[2] || []);
        setMyRequests([]);
      } else {
        setApprovals([]);
        setMyRequests(results[2] || []);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to load organization admin data.";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  // Initial load
  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  // Realtime subscription
  useEffect(() => {
    if (!actor?.org_id) {
      return;
    }

    const unsubscribe = subscribeToOrgAdminRealtime(actor.org_id, {
      onAnyChange: () => {
        void loadData(true);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [actor?.org_id, loadData]);

  const handleInviteMember = useCallback(
    async (email: string): Promise<AdminActionResult> => {
      setActionInProgress("invite");
      setError(null);
      try {
        const result = await adminService.inviteMember(email);
        await refresh();
        return result;
      } catch (err: any) {
        const msg = err?.message || "Failed to invite teammate.";
        setError(msg);
        throw err;
      } finally {
        setActionInProgress(null);
      }
    },
    [refresh],
  );

  const handleChangeRole = useCallback(
    async (userId: string, newRole: OrgRole): Promise<AdminActionResult> => {
      setActionInProgress(`role-${userId}`);
      setError(null);
      try {
        const result = await adminService.changeMemberRole(userId, newRole);
        await refresh();
        return result;
      } catch (err: any) {
        const msg = err?.message || "Failed to change member role.";
        setError(msg);
        throw err;
      } finally {
        setActionInProgress(null);
      }
    },
    [refresh],
  );

  const handleRemoveMember = useCallback(
    async (userId: string): Promise<AdminActionResult> => {
      setActionInProgress(`remove-${userId}`);
      setError(null);
      try {
        const result = await adminService.removeMember(userId);
        await refresh();
        return result;
      } catch (err: any) {
        const msg = err?.message || "Failed to remove member.";
        setError(msg);
        throw err;
      } finally {
        setActionInProgress(null);
      }
    },
    [refresh],
  );

  const handleRevokeInvite = useCallback(
    async (inviteId: string): Promise<AdminActionResult> => {
      setActionInProgress(`revoke-${inviteId}`);
      setError(null);
      try {
        const result = await adminService.revokeInvite(inviteId);
        await refresh();
        return result;
      } catch (err: any) {
        const msg = err?.message || "Failed to revoke invitation.";
        setError(msg);
        throw err;
      } finally {
        setActionInProgress(null);
      }
    },
    [refresh],
  );

  const handleDecideApproval = useCallback(
    async (approvalId: string, decision: "approve" | "reject"): Promise<AdminActionResult> => {
      setActionInProgress(`approval-${approvalId}`);
      setError(null);
      try {
        const result = await adminService.decideApproval(approvalId, decision);
        await refresh();
        return result;
      } catch (err: any) {
        const msg = err?.message || "Failed to submit approval decision.";
        setError(msg);
        throw err;
      } finally {
        setActionInProgress(null);
      }
    },
    [refresh],
  );

  return {
    actor,
    members,
    invites,
    approvals,
    myRequests,
    loading,
    refreshing,
    actionInProgress,
    error,
    loadAll: () => loadData(false),
    refresh,
    inviteMember: handleInviteMember,
    changeRole: handleChangeRole,
    removeMember: handleRemoveMember,
    revokeInvite: handleRevokeInvite,
    decideApproval: handleDecideApproval,
  };
}
