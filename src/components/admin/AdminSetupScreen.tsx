"use client";

/* Screen 14 — Admin · Pool Setup & Accounts. Ported from wadau-adminsetup.jsx
   (AdminSetupApp). Rendered inside PageShell. */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useAuth } from "@/lib/auth";
import { Btn, ConfirmDialog, PageHead, SectionLabel } from "@/components/ui";
import { ACCOUNTS, AdminInput, AdminToggle, PENDING_JOINS, StatusPill } from "@/components/admin/parts";
import { auth } from "@/lib/firebase";
import { subscribePendingJoinRequests, subscribePlayers, type JoinRequestWithId, type PlayerWithId } from "@/lib/firestore";
import { digitsOnly, displayPhone } from "@/lib/phone";

const FIREBASE_CONFIGURED = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
type PendingJoinRow = (typeof PENDING_JOINS)[number] | JoinRequestWithId;
type AccountRow = (typeof ACCOUNTS)[number] | (PlayerWithId & { status: "pending" | "active" | "unpaid" | "drafted" | "undrafted" });

function toDateTimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) return { "Content-Type": "application/json" };
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function PoolSettings() {
  const [lockAt, setLockAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pool-lock")
      .then((res) => res.ok ? res.json() : null)
      .then((data: { lockAt?: string } | null) => {
        if (cancelled || !data?.lockAt) return;
        setLockAt(toDateTimeLocalValue(new Date(data.lockAt)));
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, []);

  const saveLock = useCallback(async () => {
    if (!lockAt) return;
    setSaving(true);
    setMessage(null);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/admin/pool-lock", {
        method: "POST",
        headers,
        body: JSON.stringify({ lockAt: new Date(lockAt).toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMessage(data?.error ?? "Failed to save lock time.");
        return;
      }
      setMessage("Lock time saved.");
    } finally {
      setSaving(false);
    }
  }, [lockAt]);

  return (
    <div className="wc-card" style={{ padding: "18px 20px" }}>
      <SectionLabel>Pool settings</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
        <div>
          <div className="wc-eyebrow" style={{ marginBottom: 7 }}>Pool name</div>
          <AdminInput value="Wadau Cup" />
        </div>
        <div>
          <div className="wc-eyebrow" style={{ marginBottom: 7 }}>Buy-in</div>
          <AdminInput value="1,000" prefix="KES" />
        </div>
        <div>
          <div className="wc-eyebrow" style={{ marginBottom: 7 }}>Payout split %</div>
          <div style={{ display: "flex", gap: 8 }}>
            {([["1st", "50"], ["2nd", "30"], ["3rd", "20"]] as const).map(([k, v]) => (
              <div key={k} style={{ flex: 1 }}>
                <div className="wc-num" style={{ fontSize: 9.5, color: "var(--gold)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {k}
                </div>
                <AdminInput value={v} suffix="%" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="wc-eyebrow" style={{ marginBottom: 7 }}>Picks lock at</div>
          <input
            type="datetime-local"
            value={lockAt}
            onChange={(e) => setLockAt(e.target.value)}
            style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600, color: "var(--text)", background: "var(--surface-2)", border: "1px solid var(--line-2)", borderRadius: 10, padding: "10px 10px", outline: "none" }}
          />
          {message && <div style={{ fontSize: 12.5, color: message.includes("saved") ? "var(--lime-ink)" : "var(--down)", marginTop: 7 }}>{message}</div>}
        </div>
        <Btn onClick={saveLock} disabled={!lockAt || saving}>{saving ? "Saving…" : "Save changes"}</Btn>
      </div>
    </div>
  );
}

function AddPlayer() {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [tempPw, setTempPw] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const create = useCallback(async () => {
    if (!newName || !newPhone) return;
    setCreating(true);
    setCreateError(null);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/admin/create-player", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: newName, phone: newPhone, cc: "+254" }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error); return; }
      setTempPw(data.tempPassword);
      setNewName("");
      setNewPhone("");
    } finally {
      setCreating(false);
    }
  }, [newName, newPhone]);

  return (
    <div className="wc-card" style={{ padding: "16px 18px", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <SectionLabel>Add a player</SectionLabel>
          <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4 }}>
            Creates a login and a one-time temporary password.
          </div>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            style={{
              padding: "9px 14px",
              borderRadius: 10,
              background: "var(--lime)",
              color: "var(--on-lime)",
              border: "none",
              fontFamily: "inherit",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + Add player
          </button>
        )}
      </div>
      {open && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 160px" }}>
              <div className="wc-eyebrow" style={{ marginBottom: 7 }}>Name</div>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name"
                style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600, color: "var(--text)", background: "var(--surface-2)", border: "1px solid var(--line-2)", borderRadius: 10, padding: "10px 10px", outline: "none" }} />
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <div className="wc-eyebrow" style={{ marginBottom: 7 }}>Phone</div>
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="712 345 678" inputMode="tel"
                style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600, color: "var(--text)", background: "var(--surface-2)", border: "1px solid var(--line-2)", borderRadius: 10, padding: "10px 10px", outline: "none" }} />
            </div>
          </div>
          {tempPw && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", borderRadius: 10, background: "var(--surface-2)", border: "1px dashed var(--gold-line)" }}>
              <div>
                <div className="wc-eyebrow wc-gold-text">Temp password</div>
                <div className="wc-num" style={{ fontSize: 15, fontWeight: 600, color: "var(--gold)", marginTop: 3, letterSpacing: "0.1em" }}>{tempPw}</div>
              </div>
              <span style={{ fontSize: 12, color: "var(--dim)" }}>Share once · they reset on first login</span>
            </div>
          )}
          {createError && <div style={{ fontSize: 12.5, color: "var(--down)" }}>{createError}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn kind="ghost" onClick={() => { setOpen(false); setTempPw(null); }}>Cancel</Btn>
            <Btn onClick={create} disabled={!newName || !newPhone || creating}>{creating ? "Creating…" : "Create login"}</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function accountStatus(a: AccountRow) {
  return a.status;
}

function accountStatusColor(status: AccountRow["status"]) {
  if (status === "active") return "var(--lime-line)";
  if (status === "pending") return "var(--gold-line)";
  if (status === "unpaid") return "var(--down)";
  return "var(--line-2)";
}

function playerAccountStatus(player: PlayerWithId): "pending" | "active" | "unpaid" | "undrafted" {
  if (player.approvalStatus === "pending") return "pending";
  if (!player.hasDrafted) return "undrafted";
  return player.paid ? "active" : "unpaid";
}

function statusWithPaid(account: AccountRow, paid: boolean): AccountRow["status"] {
  if ("approvalStatus" in account && account.approvalStatus === "pending") return "pending";
  if ("hasDrafted" in account && !account.hasDrafted) return "undrafted";
  return paid ? "active" : "unpaid";
}

function accountKey(a: AccountRow) {
  return "uid" in a ? a.uid : a.name;
}

function accountPhoneKey(a: AccountRow) {
  return digitsOnly(a.phone);
}

function preferAccount(existing: AccountRow, next: AccountRow, currentUid?: string | null) {
  if ("uid" in next && next.uid === currentUid) return next;
  if ("uid" in existing && existing.uid === currentUid) return existing;
  if (accountStatus(next) === "active" && accountStatus(existing) !== "active") return next;
  return existing;
}

function uniqueAccountsByPhone(accounts: AccountRow[], currentUid?: string | null) {
  const byPhone = new Map<string, AccountRow>();
  for (const account of accounts) {
    const key = accountPhoneKey(account);
    const existing = byPhone.get(key);
    byPhone.set(key, existing ? preferAccount(existing, account, currentUid) : account);
  }
  return Array.from(byPhone.values());
}

function AccountActions({
  account,
  onDelete,
  onReset,
  onSetAdmin,
}: {
  account: AccountRow;
  onDelete: (account: AccountRow) => void;
  onReset: (account: AccountRow) => void;
  onSetAdmin: (account: AccountRow) => void;
}) {
  const currentUid = auth.currentUser?.uid;
  const canDelete = "uid" in account && account.uid !== currentUid;
  const canReset = "uid" in account;
  const canChangeAdmin = "uid" in account && (account.uid !== currentUid || !account.isAdmin);
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", gap: 8, flexWrap: "wrap" }}>
      {"uid" in account && (
        <button
          onClick={() => {
            if (canChangeAdmin) onSetAdmin(account);
          }}
          disabled={!canChangeAdmin}
          style={{
            background: account.isAdmin ? "var(--lime-soft)" : "none",
            border: `1px solid ${account.isAdmin ? "var(--lime-line)" : "var(--line-2)"}`,
            borderRadius: 8,
            padding: "6px 10px",
            color: account.isAdmin ? "var(--lime-ink)" : "var(--dim)",
            fontFamily: "inherit",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: canChangeAdmin ? "pointer" : "not-allowed",
            opacity: canChangeAdmin ? 1 : 0.5,
            whiteSpace: "nowrap",
          }}
        >
          {account.isAdmin ? "Demote" : "Promote"}
        </button>
      )}
      <button
        onClick={() => {
          if (canReset) onReset(account);
        }}
        disabled={!canReset}
        style={{
          background: "none",
          border: "1px solid var(--line-2)",
          borderRadius: 8,
          padding: "6px 10px",
          color: "var(--dim)",
          fontFamily: "inherit",
          fontSize: 11.5,
          fontWeight: 600,
          cursor: canReset ? "pointer" : "not-allowed",
          opacity: canReset ? 1 : 0.5,
          whiteSpace: "nowrap",
        }}
      >
        Reset
      </button>
      {canDelete && (
        <button
          onClick={() => onDelete(account)}
          aria-label={`Delete ${account.name}`}
          title={`Delete ${account.name}`}
          style={{
            background: "var(--down-soft)",
            border: "1px solid transparent",
            borderRadius: 8,
            width: 33,
            height: 33,
            color: "var(--down)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flex: "none",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M7.5 4.5h5M8.5 4.5V3h3v1.5M4.5 6h11M6 6l.7 10h6.6L14 6M8.7 8.5v5M11.3 8.5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

function AccountsTable({
  accounts,
  updatingPaidUid,
  onDelete,
  onReset,
  onSetAdmin,
  onTogglePaid,
}: {
  accounts: AccountRow[];
  updatingPaidUid: string | null;
  onDelete: (account: AccountRow) => void;
  onReset: (account: AccountRow) => void;
  onSetAdmin: (account: AccountRow) => void;
  onTogglePaid: (account: AccountRow) => void;
}) {
  const desktopColumns = "minmax(220px, 1fr) 112px 54px 220px";
  const desktopGap = 12;
  return (
    <div className="wc-card" style={{ overflow: "hidden", padding: 0, minWidth: 0 }}>
      <div
        className="wc-desktop-only"
        style={{ gridTemplateColumns: desktopColumns, gap: desktopGap, padding: "14px 18px 10px", borderBottom: "1px solid var(--line)", display: "grid" }}
      >
        {["Player", "Status", "Paid", "Actions"].map((h) => (
          <span key={h} className="wc-eyebrow" style={{ fontSize: 9.5, textAlign: h === "Paid" ? "center" : "left" }}>
            {h}
          </span>
        ))}
      </div>
      {accounts.map((a, i) => (
        <div key={accountKey(a)} style={{ borderBottom: i === accounts.length - 1 ? "none" : "1px solid var(--line)" }}>
          {/* desktop */}
          <div
            className="wc-desktop-only"
            style={{ gridTemplateColumns: desktopColumns, gap: desktopGap, alignItems: "center", padding: "11px 18px", display: "grid" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
              <div className="wc-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                {a.short}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                <div className="wc-num" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2, whiteSpace: "nowrap" }}>
                  {displayPhone(a.phone)}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <StatusPill status={accountStatus(a)} />
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 7 }}>
              {"uid" in a ? (
                <>
                  <AdminToggle
                    on={!!a.paid}
                    onClick={() => onTogglePaid(a)}
                    label={a.paid ? `Mark ${a.name} unpaid` : `Mark ${a.name} paid`}
                  />
                  {updatingPaidUid === a.uid && (
                    <span className="wc-num" style={{ fontSize: 10, color: "var(--faint)" }}>
                      …
                    </span>
                  )}
                </>
              ) : (
                <span className="wc-num" style={{ fontSize: 12, color: "var(--faint)" }}>—</span>
              )}
            </div>
            <AccountActions account={a} onDelete={onDelete} onReset={onReset} onSetAdmin={onSetAdmin} />
          </div>
          {/* mobile */}
          <div
            className="wc-mobile-only"
            style={{
              gridTemplateColumns: "minmax(0, 1fr) auto",
              gap: 12,
              alignItems: "center",
              padding: "11px 14px 11px 16px",
              display: "grid",
              borderLeft: `3px solid ${accountStatusColor(accountStatus(a))}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
              <div className="wc-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                {a.short}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                <div className="wc-num" style={{ fontSize: 11, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {displayPhone(a.phone)}
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "auto auto auto", justifyItems: "end", alignItems: "center", gap: 7 }}>
              <div style={{ gridColumn: "1 / -1", justifySelf: "end" }}>
                <StatusPill status={accountStatus(a)} />
              </div>
              {"uid" in a && (
                <AdminToggle
                  on={!!a.paid}
                  onClick={() => onTogglePaid(a)}
                  label={a.paid ? `Mark ${a.name} unpaid` : `Mark ${a.name} paid`}
                />
              )}
              {"uid" in a && (
                <button
                  onClick={() => onSetAdmin(a)}
                  className="wc-iconbtn"
                  aria-label={a.isAdmin ? `Demote ${a.name} from admin` : `Promote ${a.name} to admin`}
                  title={a.isAdmin ? `Demote ${a.name} from admin` : `Promote ${a.name} to admin`}
                  disabled={a.uid === auth.currentUser?.uid && a.isAdmin}
                  style={{
                    width: 32,
                    height: 32,
                    color: a.isAdmin ? "var(--lime-ink)" : "var(--dim)",
                    borderColor: a.isAdmin ? "var(--lime-line)" : undefined,
                    opacity: a.uid === auth.currentUser?.uid && a.isAdmin ? 0.45 : 1,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 2.5 14 4v4.2c0 3-1.9 5.7-5 7.3-3.1-1.6-5-4.3-5-7.3V4l5-1.5Z" />
                    {a.isAdmin && <path d="m6.8 9 1.4 1.4 3-3.2" />}
                  </svg>
                </button>
              )}
              {"uid" in a && (
                <button
                  onClick={() => onReset(a)}
                  className="wc-iconbtn"
                  aria-label={`Reset ${a.name}'s password`}
                  title={`Reset ${a.name}'s password`}
                  style={{ width: 32, height: 32 }}
                >
                  <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 6.5A5 5 0 1 0 15 11" />
                    <path d="M14.5 3.5v3h-3" />
                    <path d="M9 8v3" />
                    <path d="M9 13h.01" />
                  </svg>
                </button>
              )}
              {"uid" in a && a.uid !== auth.currentUser?.uid && (
                <button
                  onClick={() => onDelete(a)}
                  aria-label={`Delete ${a.name}`}
                  title={`Delete ${a.name}`}
                  style={{
                    background: "var(--down-soft)",
                    border: "1px solid transparent",
                    borderRadius: 8,
                    width: 32,
                    height: 32,
                    color: "var(--down)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M7.5 4.5h5M8.5 4.5V3h3v1.5M4.5 6h11M6 6l.7 10h6.6L14 6M8.7 8.5v5M11.3 8.5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlayerAccounts() {
  const [accounts, setAccounts] = useState<AccountRow[]>(FIREBASE_CONFIGURED ? [] : ACCOUNTS);
  const [loading, setLoading] = useState(FIREBASE_CONFIGURED);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccountRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetTarget, setResetTarget] = useState<AccountRow | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetTempPassword, setResetTempPassword] = useState<string | null>(null);
  const [updatingPaidUid, setUpdatingPaidUid] = useState<string | null>(null);
  const [paidError, setPaidError] = useState<string | null>(null);
  const [adminTarget, setAdminTarget] = useState<AccountRow | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [updatingAdmin, setUpdatingAdmin] = useState(false);

  useEffect(() => {
    if (!FIREBASE_CONFIGURED) return;
    setLoading(true);
    return subscribePlayers(
      (players) => {
        const rows = players.map((p) => ({ ...p, status: playerAccountStatus(p) }) satisfies AccountRow);
        setAccounts(uniqueAccountsByPhone(rows, auth.currentUser?.uid));
        setLoadError(null);
        setLoading(false);
      },
      () => {
        setLoadError("Could not load player accounts.");
        setLoading(false);
      },
    );
  }, []);

  const deletePlayer = useCallback(async () => {
    if (!deleteTarget || !("uid" in deleteTarget)) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/admin/delete-player", {
        method: "POST",
        headers,
        body: JSON.stringify({ uid: deleteTarget.uid }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setDeleteError(data?.error ?? "Failed to delete player.");
        return;
      }
      setAccounts((current) => current.filter((account) => accountKey(account) !== accountKey(deleteTarget)));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  const resetPassword = useCallback(async () => {
    if (!resetTarget || !("uid" in resetTarget)) return;
    setResetting(true);
    setResetError(null);
    setResetTempPassword(null);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers,
        body: JSON.stringify({ uid: resetTarget.uid }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setResetError(data?.error ?? "Failed to reset password.");
        return;
      }
      setResetTempPassword(data?.tempPassword ?? null);
      setAccounts((current) => current.map((account) => (
        accountKey(account) === accountKey(resetTarget) ? { ...account, passwordSet: false } : account
      )));
    } finally {
      setResetting(false);
    }
  }, [resetTarget]);

  const togglePaid = useCallback(async (account: AccountRow) => {
    if (!("uid" in account) || updatingPaidUid) return;
    const nextPaid = !account.paid;
    setUpdatingPaidUid(account.uid);
    setPaidError(null);
    setAccounts((current) => current.map((row) => (
      accountKey(row) === accountKey(account)
        ? { ...row, paid: nextPaid, status: statusWithPaid(row, nextPaid) }
        : row
    )));
    try {
      const headers = await authHeader();
      const res = await fetch("/api/admin/player-paid", {
        method: "POST",
        headers,
        body: JSON.stringify({ uid: account.uid, paid: nextPaid }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to update payment status.");
      }
      await fetch("/api/admin/recompute", { method: "POST", headers }).catch(() => null);
    } catch (error) {
      setAccounts((current) => current.map((row) => (
        accountKey(row) === accountKey(account)
          ? { ...row, paid: account.paid, status: statusWithPaid(row, account.paid) }
          : row
      )));
      setPaidError((error as Error).message);
    } finally {
      setUpdatingPaidUid(null);
    }
  }, [updatingPaidUid]);

  const setAdminRole = useCallback(async () => {
    if (!adminTarget || !("uid" in adminTarget) || !auth.currentUser?.email) return;
    if (!adminPassword) {
      setAdminError("Enter your admin password.");
      return;
    }
    const nextIsAdmin = !adminTarget.isAdmin;
    setUpdatingAdmin(true);
    setAdminError(null);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, adminPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await auth.currentUser.getIdToken(true);
      const headers = await authHeader();
      const res = await fetch("/api/admin/set-admin", {
        method: "POST",
        headers,
        body: JSON.stringify({ uid: adminTarget.uid, isAdmin: nextIsAdmin }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to update admin role.");
      }
      setAccounts((current) => current.map((row) => (
        accountKey(row) === accountKey(adminTarget) ? { ...row, isAdmin: nextIsAdmin } : row
      )));
      setAdminTarget(null);
      setAdminPassword("");
    } catch (error) {
      const code = (error as { code?: string }).code;
      setAdminError(
        code === "auth/invalid-credential" || code === "auth/wrong-password"
          ? "Incorrect admin password."
          : (error as Error).message,
      );
    } finally {
      setUpdatingAdmin(false);
    }
  }, [adminPassword, adminTarget]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Player accounts</span>
        <span className="wc-num" style={{ fontSize: 12.5, color: "var(--dim)" }}>
          {accounts.length} registered
        </span>
      </div>
      {loading ? (
        <div className="wc-card" style={{ padding: "16px 18px", fontSize: 13, color: "var(--dim)" }}>Loading player accounts…</div>
      ) : loadError ? (
        <div className="wc-card" style={{ padding: "16px 18px", fontSize: 13, color: "var(--down)" }}>{loadError}</div>
      ) : (
        <>
          {paidError && (
            <div className="wc-card" style={{ padding: "12px 14px", fontSize: 12.5, color: "var(--down)", marginBottom: 10 }}>
              {paidError}
            </div>
          )}
          <AccountsTable
            accounts={accounts}
            updatingPaidUid={updatingPaidUid}
            onTogglePaid={togglePaid}
            onDelete={setDeleteTarget}
            onReset={(account) => {
              setResetTarget(account);
              setResetError(null);
              setResetTempPassword(null);
            }}
            onSetAdmin={(account) => {
              setAdminTarget(account);
              setAdminPassword("");
              setAdminError(null);
            }}
          />
        </>
      )}
      {adminTarget && "uid" in adminTarget && (
        <ConfirmDialog
          title={adminTarget.isAdmin ? `Demote ${adminTarget.name}?` : `Promote ${adminTarget.name}?`}
          body={
            adminTarget.isAdmin
              ? "This removes admin access for this player. They will keep their player account."
              : "This gives the player access to admin screens and admin actions."
          }
          confirmLabel={updatingAdmin ? "Updating…" : adminTarget.isAdmin ? "Demote" : "Promote"}
          cancelLabel="Cancel"
          tone="gold"
          onConfirm={setAdminRole}
          onClose={() => {
            if (updatingAdmin) return;
            setAdminTarget(null);
            setAdminPassword("");
            setAdminError(null);
          }}
        >
          <div style={{ padding: "12px 13px", marginTop: 16, background: "var(--surface-2)", border: "1px solid var(--gold-line)", borderRadius: 12 }}>
            <div className="wc-eyebrow wc-gold-text">Admin password</div>
            <input
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void setAdminRole();
                }
              }}
              style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600, color: "var(--text)", background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 10, padding: "10px 10px", outline: "none", marginTop: 8 }}
            />
            {adminError && <div style={{ fontSize: 12.5, color: "var(--down)", marginTop: 8 }}>{adminError}</div>}
          </div>
        </ConfirmDialog>
      )}
      {resetTarget && (
        <ConfirmDialog
          title={`Reset ${resetTarget.name}'s password?`}
          body="This will issue a new temporary password. The player must set a new password the next time they log in."
          confirmLabel={resetting ? "Resetting…" : resetTempPassword ? "Reset again" : "Reset password"}
          cancelLabel={resetTempPassword ? "Done" : "Keep current password"}
          tone="gold"
          onConfirm={resetPassword}
          onClose={() => {
            if (!resetting) {
              setResetTarget(null);
              setResetError(null);
              setResetTempPassword(null);
            }
          }}
        >
          <div style={{ padding: "12px 13px", marginTop: 16, background: "var(--surface-2)", border: "1px solid var(--gold-line)", borderRadius: 12 }}>
            <div className="wc-eyebrow wc-gold-text">Temporary password</div>
            <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.45, marginTop: 6 }}>
              {displayPhone(resetTarget.phone)}
            </div>
            {resetTempPassword && (
              <div className="wc-num" style={{ fontSize: 18, color: "var(--text)", marginTop: 8 }}>
                {resetTempPassword}
              </div>
            )}
            {resetError && <div style={{ fontSize: 12.5, color: "var(--down)", marginTop: 8 }}>{resetError}</div>}
          </div>
        </ConfirmDialog>
      )}
      {deleteTarget && (
        <ConfirmDialog
          title={`Delete ${deleteTarget.name}?`}
          body="This removes the player's login and pool account. Their picks and payment status will be deleted."
          confirmLabel={deleting ? "Deleting…" : "Delete player"}
          cancelLabel="Keep player"
          tone="gold"
          onConfirm={deletePlayer}
          onClose={() => {
            if (!deleting) {
              setDeleteTarget(null);
              setDeleteError(null);
            }
          }}
        >
          <div style={{ padding: "12px 13px", marginTop: 16, background: "var(--surface-2)", border: "1px solid var(--gold-line)", borderRadius: 12 }}>
            <div className="wc-eyebrow wc-gold-text">Permanent action</div>
            <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.45, marginTop: 6 }}>
              {displayPhone(deleteTarget.phone)}
            </div>
            {deleteError && <div style={{ fontSize: 12.5, color: "var(--down)", marginTop: 8 }}>{deleteError}</div>}
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}

function PendingJoins() {
  const [list, setList] = useState<PendingJoinRow[]>(
    FIREBASE_CONFIGURED ? [] : PENDING_JOINS,
  );
  const [loading, setLoading] = useState(FIREBASE_CONFIGURED);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ name: string; tempPassword?: string; accountExisted?: boolean; error?: string } | null>(null);

  useEffect(() => {
    if (!FIREBASE_CONFIGURED) return;
    setLoading(true);
    return subscribePendingJoinRequests(
      (requests) => {
        setList(requests);
        setLoadError(null);
        setLoading(false);
      },
      () => {
        setLoadError("Could not load join requests.");
        setLoading(false);
      },
    );
  }, []);

  const act = useCallback(async (i: number, action: "approve" | "decline") => {
    const r = list[i] as (typeof PENDING_JOINS)[number] & { id?: string };
    setMessage(null);
    if (r.id) {
      const headers = await authHeader();
      const res = await fetch("/api/admin/approve-join", {
        method: "POST", headers, body: JSON.stringify({ requestId: r.id, action }),
      }).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (!res?.ok) {
        setMessage({ name: r.name, error: data?.error ?? "Could not update join request." });
        return;
      }
      if (action === "approve") {
        setMessage({ name: r.name, tempPassword: data?.tempPassword, accountExisted: data?.accountExisted });
      }
    }
    setList(list.filter((_, j) => j !== i));
  }, [list]);
  const drop = (i: number) => act(i, "decline");
  const whenLabel = (r: PendingJoinRow) => "when" in r ? r.when : "pending";

  return (
    <div className="wc-card" style={{ padding: "16px 18px", border: "1px solid var(--gold-line)", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionLabel style={{ color: "var(--gold)" }}>Join requests</SectionLabel>
        <span className="wc-num" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--gold)" }}>
          {list.length} pending
        </span>
      </div>
      {loading ? (
        <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 12 }}>Loading requests…</div>
      ) : loadError ? (
        <div style={{ fontSize: 13, color: "var(--down)", marginTop: 12 }}>{loadError}</div>
      ) : list.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 12 }}>No requests right now.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 13 }}>
          {list.map((r, i) => (
            <div key={"id" in r ? r.id : r.phone} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                  {r.name} <span className="wc-eyebrow" style={{ marginLeft: 4 }}>{whenLabel(r)}</span>
                </div>
                <div className="wc-num" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>
                  {displayPhone(r.phone)}
                </div>
              </div>
              <button
                onClick={() => drop(i)}
                style={{
                  padding: "7px 11px",
                  borderRadius: 9,
                  border: "1px solid var(--line-2)",
                  background: "transparent",
                  color: "var(--dim)",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Decline
              </button>
              <button
                onClick={() => act(i, "approve")}
                style={{
                  padding: "7px 13px",
                  borderRadius: 9,
                  border: "none",
                  background: "var(--lime)",
                  color: "var(--on-lime)",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Approve
              </button>
            </div>
          ))}
        </div>
      )}
      {message && (
        <div style={{ marginTop: 13, padding: "11px 12px", borderRadius: 10, background: message.error ? "var(--down-soft)" : "var(--lime-soft)", color: message.error ? "var(--down)" : "var(--lime-ink)", fontSize: 12.5, fontWeight: 700 }}>
          {message.error ? message.error : (
            <>
              {message.name} approved.
              {message.tempPassword && (
                <span className="wc-num" style={{ marginLeft: 8 }}>
                  Temp password {message.tempPassword}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminSetupScreen() {
  const { ready, isAdmin } = useAuth();
  const router = useRouter();
  if (ready && !isAdmin) { router.replace("/"); return null; }
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 28px 56px" }}>
      <PageHead
        title="Pool setup & accounts"
        sub="Configure the pool and manage who can log in."
        right={
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link href="/admin" className="wc-back-link">
              Data control
            </Link>
            <Link href="/admin/results" className="wc-back-link">
              Match results →
            </Link>
          </div>
        }
      />

      {/* desktop: settings rail + main */}
      <div className="wc-desktop-only" style={{ gridTemplateColumns: "340px minmax(0, 1fr)", gap: 24, alignItems: "start", display: "grid", minWidth: 0 }}>
        <PoolSettings />
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <PendingJoins />
          <AddPlayer />
          <PlayerAccounts />
        </div>
      </div>

      {/* mobile: stacked */}
      <div className="wc-mobile-only" style={{ flexDirection: "column", gap: 16, display: "flex" }}>
        <PendingJoins />
        <PoolSettings />
        <AddPlayer />
        <PlayerAccounts />
      </div>
    </div>
  );
}
