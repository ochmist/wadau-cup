"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageHead, SectionLabel } from "@/components/ui";
import { fixtureHref } from "@/components/entity-links";
import { T } from "@/lib/data";
import { fixtureStageLabel } from "@/lib/fixtures";
import { useFixtures } from "@/hooks/useFixtures";
import { useResults } from "@/hooks/useResults";
import { useStandings } from "@/hooks/useStandings";
import { useTeamProfiles } from "@/hooks/useTeamProfiles";
import { enrichPlayerTeams, useMyData } from "@/hooks/useMyData";
import { useAuth } from "@/lib/auth";
import type { FixtureWithId, ResultWithId } from "@/lib/firestore";
import type { SerializedPlayer, TeamProfileDoc } from "@/lib/types";

function kickoffLabel(value?: string | null) {
  if (!value) return "Time TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time TBD";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function matchTeams(match: Pick<FixtureWithId, "a" | "b" | "aName" | "bName">, code: string) {
  const opponentCode = match.a === code ? match.b : match.a;
  const opponentName = match.a === code ? match.bName : match.aName;
  const opponent = opponentCode ? T[opponentCode] : null;
  return { opponentCode, opponentName: opponent?.n ?? opponentName ?? "TBD", opponentFlag: opponent?.f ?? "•" };
}

function resultScore(result: ResultWithId) {
  const score = result.sa == null || result.sb == null ? "Result entered" : `${result.sa}-${result.sb}`;
  return result.pens ? `${score} · pens ${result.pens}` : score;
}

function resultTone(result: ResultWithId, code: string) {
  if (result.win === "draw") return "Draw";
  if (result.win === code) return result.round === "Final" ? "Champion" : "Win";
  return "Loss";
}

function holderRows(players: SerializedPlayer[], code: string) {
  return players
    .map((player) => {
      const team = player.teams.find((entry) => entry.code === code);
      return team ? { player, team } : null;
    })
    .filter((row): row is { player: SerializedPlayer; team: SerializedPlayer["teams"][number] } => Boolean(row))
    .sort((a, b) => {
      const aRank = a.player.rank > 0 ? a.player.rank : 999;
      const bRank = b.player.rank > 0 ? b.player.rank : 999;
      return aRank - bRank || b.team.pts - a.team.pts;
    });
}

function TeamMatchRow({ match, code, result }: { match: FixtureWithId; code: string; result?: ResultWithId }) {
  const opponent = matchTeams(match, code);
  const live = match.status === "live";
  const finished = result || match.status === "finished";
  return (
    <Link
      href={fixtureHref(match.id)}
      className="wc-card"
      style={{
        padding: "13px 14px",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        alignItems: "center",
        color: "var(--text)",
        textDecoration: "none",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div className="wc-eyebrow">{fixtureStageLabel(match.round, match.group)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, minWidth: 0 }}>
          <span className="wc-flag" style={{ width: 24, height: 24, fontSize: 15 }}>{opponent.opponentFlag}</span>
          <span style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            vs {opponent.opponentName}
          </span>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="wc-num" style={{ fontSize: 13, color: live ? "var(--lime-ink)" : "var(--dim)", fontWeight: live || finished ? 800 : 600 }}>
          {result ? resultScore(result) : live ? "LIVE" : kickoffLabel(match.kickoffAt)}
        </div>
        {result && (
          <div className="wc-eyebrow" style={{ marginTop: 4, color: result.win === code ? "var(--lime-ink)" : result.win === "draw" ? "var(--gold)" : "var(--faint)" }}>
            {resultTone(result, code)}
          </div>
        )}
      </div>
    </Link>
  );
}

function SquadCard({ profile }: { profile?: TeamProfileDoc }) {
  if (!profile?.players?.length && !profile?.coach) {
    return (
      <div className="wc-card" style={{ padding: 16 }}>
        <SectionLabel>Squad</SectionLabel>
        <div style={{ color: "var(--dim)", fontSize: 13.5, marginTop: 10 }}>
          Squad and coach details will appear when the provider publishes them.
        </div>
      </div>
    );
  }
  const grouped = (profile.players ?? []).reduce<Record<string, NonNullable<TeamProfileDoc["players"]>>>((acc, player) => {
    const key = player.position ?? "Squad";
    acc[key] = [...(acc[key] ?? []), player];
    return acc;
  }, {});
  return (
    <div className="wc-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <SectionLabel>Squad</SectionLabel>
        {profile.coach?.name && <span className="wc-num" style={{ fontSize: 12, color: "var(--dim)" }}>Coach · {profile.coach.name}</span>}
      </div>
      <div style={{ display: "grid", gap: 13, marginTop: 14 }}>
        {Object.entries(grouped).map(([position, players]) => (
          <div key={position}>
            <div className="wc-eyebrow" style={{ marginBottom: 7 }}>{position}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {players.map((player) => (
                <span key={player.id} className="wc-pill" style={{ padding: "5px 9px", fontSize: 10.5 }}>
                  {player.number ? `${player.number} · ` : ""}{player.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamScreen({ code }: { code: string }) {
  const teamCode = code.toUpperCase();
  const team = T[teamCode];
  const { user } = useAuth();
  const { players, loading: standingsLoading } = useStandings(user?.uid);
  const { player: myPlayer } = useMyData();
  const { fixtures, loading: fixturesLoading } = useFixtures();
  const { results, loading: resultsLoading } = useResults();
  const { teams: profiles } = useTeamProfiles();
  const profile = profiles.find((entry) => entry.code === teamCode);

  const teamFixtures = useMemo(
    () => fixtures.filter((fixture) => fixture.a === teamCode || fixture.b === teamCode),
    [fixtures, teamCode],
  );
  const resultsById = useMemo(() => new Map(results.map((result) => [result.id, result])), [results]);
  const holders = useMemo(() => {
    const rows = holderRows(players, teamCode);
    if (!user?.uid || !myPlayer?.picks || rows.some((row) => row.player.uid === user.uid)) return rows;
    const myTeam = enrichPlayerTeams(myPlayer).find((entry) => entry.code === teamCode);
    if (!myTeam) return rows;
    const currentPlayer: SerializedPlayer = {
      uid: user.uid,
      name: myPlayer.name,
      short: myPlayer.short,
      phone: myPlayer.phone,
      paid: myPlayer.paid,
      approvalStatus: myPlayer.approvalStatus ?? "approved",
      passwordSet: myPlayer.passwordSet,
      hasDrafted: myPlayer.hasDrafted,
      finalGoals: myPlayer.finalGoals,
      points: myPlayer.points ?? myTeam.pts,
      ceiling: myPlayer.ceiling ?? myTeam.pts + myTeam.rem,
      rank: myPlayer.rank ?? 0,
      prevRank: myPlayer.prevRank ?? 0,
      mover: myPlayer.mover ?? 0,
      payout: myPlayer.payout ?? 0,
      aliveCount: myPlayer.aliveCount ?? 0,
      teams: [
        {
          code: myTeam.code,
          name: myTeam.name,
          flag: myTeam.flag,
          tier: myTeam.tier,
          pts: myTeam.pts,
          rem: myTeam.rem,
          alive: myTeam.alive,
        },
      ],
      me: true,
    };
    return holderRows([...players, currentPlayer], teamCode);
  }, [players, teamCode, myPlayer, user?.uid]);

  if (!team) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>
        <div className="wc-card" style={{ padding: 20 }}>
          <SectionLabel>Team not found</SectionLabel>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>No team exists for {code}</div>
        </div>
      </div>
    );
  }

  const loading = fixturesLoading || resultsLoading || standingsLoading;

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 24px 64px" }}>
      <PageHead
        title={`${team.f} ${team.n}`}
        sub={`Tier ${team.t}${profile?.group ? ` · Group ${profile.group}` : ""}`}
        right={<Link href="/world-cup" style={{ color: "var(--lime-ink)", fontWeight: 800, textDecoration: "none" }}>World Cup table →</Link>}
      />
      <div className="wc-team-layout" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(280px, 0.65fr)", gap: 18, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 16 }}>
          <div className="wc-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
              <SectionLabel>Path</SectionLabel>
              <span className="wc-num" style={{ fontSize: 12, color: "var(--dim)" }}>{teamFixtures.length} matches</span>
            </div>
            {loading ? (
              <div style={{ color: "var(--dim)", fontSize: 13 }}>Loading matches…</div>
            ) : teamFixtures.length ? (
              <div style={{ display: "grid", gap: 9 }}>
                {teamFixtures.map((fixture) => (
                  <TeamMatchRow key={fixture.id} match={fixture} code={teamCode} result={resultsById.get(fixture.id)} />
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--dim)", fontSize: 13 }}>No fixtures found for this team yet.</div>
            )}
          </div>
          <SquadCard profile={profile} />
        </div>
        <div className="wc-card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <SectionLabel>Pool holders</SectionLabel>
            <span className="wc-num" style={{ fontSize: 12, color: "var(--dim)" }}>{holders.length}</span>
          </div>
          <div style={{ display: "grid", gap: 9, marginTop: 14 }}>
            {holders.length ? holders.map(({ player, team: pick }) => (
              <Link
                key={player.uid}
                href={`/player/${encodeURIComponent(player.name)}`}
                className="wc-card"
                style={{ padding: "11px 12px", display: "flex", alignItems: "center", gap: 10, color: "var(--text)", textDecoration: "none" }}
              >
                <div className="wc-avatar" style={{ width: 34, height: 34, borderRadius: 10 }}>{player.short}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.name}</div>
                  <div className="wc-num" style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>
                    {player.rank > 0 ? `P${player.rank}` : "unranked"} · {pick.pts} pts · +{pick.rem} left
                  </div>
                </div>
              </Link>
            )) : (
              <div style={{ color: "var(--dim)", fontSize: 13 }}>No pool entries hold this team.</div>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        @media (max-width: 760px) {
          .wc-team-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
