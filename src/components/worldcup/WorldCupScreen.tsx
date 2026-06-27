"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageHead, SectionLabel } from "@/components/ui";
import { fixtureHref, teamHref } from "@/components/entity-links";
import { GROUP_ORDER, GROUPS, T } from "@/lib/data";
import { fixtureStageLabel } from "@/lib/fixtures";
import { useFixtures } from "@/hooks/useFixtures";
import { useResults } from "@/hooks/useResults";
import { useStandings } from "@/hooks/useStandings";
import { useTeamProfiles } from "@/hooks/useTeamProfiles";
import { useAuth } from "@/lib/auth";
import type { FixtureWithId, ResultWithId } from "@/lib/firestore";

type TableRow = {
  code: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
};

function blankRow(code: string): TableRow {
  return { code, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
}

function applyResult(row: TableRow, result: ResultWithId, side: "a" | "b") {
  const forGoals = side === "a" ? result.sa : result.sb;
  const againstGoals = side === "a" ? result.sb : result.sa;
  if (forGoals == null || againstGoals == null) return;
  row.played += 1;
  row.gf += forGoals;
  row.ga += againstGoals;
  row.gd = row.gf - row.ga;
  if (forGoals > againstGoals) {
    row.wins += 1;
    row.pts += 3;
  } else if (forGoals === againstGoals) {
    row.draws += 1;
    row.pts += 1;
  } else {
    row.losses += 1;
  }
}

function kickoffLabel(value?: string | null) {
  if (!value) return "Time TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time TBD";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function WorldCupScreen() {
  const { user } = useAuth();
  const { fixtures, loading: fixturesLoading } = useFixtures();
  const { results, loading: resultsLoading } = useResults();
  const { teams: profiles } = useTeamProfiles();
  const { players } = useStandings(user?.uid);

  const groupForCode = (code?: string | null) => code ? (GROUPS[code] ?? profiles.find((profile) => profile.code === code)?.group ?? null) : null;
  const validGroup = (value?: string | null) => {
    if (!value) return null;
    const normalized = value.replace(/^group\s+/i, "").trim().toUpperCase();
    return GROUP_ORDER.includes(normalized as (typeof GROUP_ORDER)[number]) ? normalized : null;
  };
  const groupFromRound = (round?: string | null) => {
    const match = round?.match(/^group\s+([A-L])$/i);
    return validGroup(match?.[1]);
  };
  const isGroupStage = (fixture?: FixtureWithId | null) => Boolean(fixture && /^group\b/i.test(fixture.round));
  const groupFromGroupStageFixture = (fixture?: FixtureWithId | null) => {
    if (!isGroupStage(fixture)) return null;
    return validGroup(fixture?.group) ?? groupFromRound(fixture?.round) ?? validGroup(groupForCode(fixture?.a)) ?? validGroup(groupForCode(fixture?.b));
  };

  const holdersByTeam = useMemo(() => {
    const map = new Map<string, { count: number; me: boolean }>();
    for (const player of players) {
      for (const team of player.teams) {
        if (!team.alive) continue;
        const current = map.get(team.code) ?? { count: 0, me: false };
        current.count += 1;
        current.me = current.me || Boolean(player.me || player.uid === user?.uid);
        map.set(team.code, current);
      }
    }
    return map;
  }, [players, user?.uid]);

  const groupMap = useMemo(() => {
    const groups = new Map<string, Set<string>>(GROUP_ORDER.map((group) => [group, new Set<string>()]));
    for (const [code, groupValue] of Object.entries(GROUPS)) {
      const group = validGroup(groupValue);
      if (!group) continue;
      groups.get(group)?.add(code);
    }
    for (const profile of profiles) {
      const group = validGroup(profile.group) ?? validGroup(GROUPS[profile.code]);
      if (!group) continue;
      groups.get(group)?.add(profile.code);
    }
    for (const fixture of fixtures) {
      const group = groupFromGroupStageFixture(fixture);
      if (!group) continue;
      if (fixture.a) groups.get(group)?.add(fixture.a);
      if (fixture.b) groups.get(group)?.add(fixture.b);
    }
    return Array.from(groups.entries())
      .filter(([, codes]) => codes.size > 0)
      .sort(([a], [b]) => GROUP_ORDER.indexOf(a as (typeof GROUP_ORDER)[number]) - GROUP_ORDER.indexOf(b as (typeof GROUP_ORDER)[number]));
  }, [fixtures, profiles]);

  const rowsByGroup = useMemo(() => {
    return groupMap.map(([group, codes]) => {
      const rows = new Map<string, TableRow>();
      codes.forEach((code) => rows.set(code, blankRow(code)));
      for (const result of results) {
        const fixture = fixtures.find((item) => item.id === result.id);
        const resultGroup = groupFromGroupStageFixture(fixture);
        if (resultGroup !== group) continue;
        if (result.a && rows.has(result.a)) applyResult(rows.get(result.a)!, result, "a");
        if (result.b && rows.has(result.b)) applyResult(rows.get(result.b)!, result, "b");
      }
      return {
        group,
        rows: Array.from(rows.values()).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || T[a.code]?.n.localeCompare(T[b.code]?.n ?? "") || 0),
      };
    });
  }, [fixtures, groupMap, results, profiles]);

  const recentResults = [...results]
    .filter((result) => result.sa != null && result.sb != null)
    .slice(0, 10);
  const nextFixtures = [...fixtures]
    .filter((fixture) => fixture.status !== "finished" && Date.parse(fixture.kickoffAt) >= Date.now())
    .sort((a, b) => Date.parse(a.kickoffAt) - Date.parse(b.kickoffAt))
    .slice(0, 8);

  const loading = fixturesLoading || resultsLoading;

  return (
    <div className="wc-worldcup-page" style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 24px 64px" }}>
      <PageHead title="World Cup table" sub="Group tables, results, and upcoming fixtures from live tournament data." />
      {loading ? (
        <div style={{ color: "var(--dim)", padding: 32 }}>Loading tournament data…</div>
      ) : (
        <div className="wc-worldcup-layout" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 360px)", gap: 18, alignItems: "start" }}>
          <div className="wc-worldcup-groups" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            {rowsByGroup.length ? rowsByGroup.map(({ group, rows }) => (
              <div key={group} className="wc-card" style={{ overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 15px 10px", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 7, background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700 }}>{group}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>Group {group}</span>
                  </div>
                  <div style={{ display: "flex", gap: 0 }}>
                    {["GD", "Pts"].map((label, index) => (
                      <span key={label} className="wc-eyebrow" style={{ width: index === 1 ? 30 : 28, flex: "none", textAlign: "center" }}>{label}</span>
                    ))}
                  </div>
                </div>
                {rows.map((row, index) => {
                  const team = T[row.code];
                  const holders = holdersByTeam.get(row.code);
                  const advancing = index < 2;
                  return (
                    <Link
                      key={row.code}
                      href={teamHref(row.code)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 15px",
                        color: "var(--text)",
                        textDecoration: "none",
                        borderBottom: index === rows.length - 1 ? "none" : "1px solid var(--line)",
                        background: holders?.me ? "var(--lime-soft)" : "transparent",
                        position: "relative",
                      }}
                    >
                      {advancing && <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: index === 0 ? "var(--lime)" : "var(--lime-line)" }} />}
                      <span className="wc-num" style={{ width: 14, flex: "none", fontSize: 12, color: advancing ? "var(--lime-ink)" : "var(--faint)", fontWeight: 600 }}>{index + 1}</span>
                      <span className="wc-flag" style={{ width: 21, height: 21, fontSize: 14, flex: "none" }}>{team?.f ?? "•"}</span>
                      <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontWeight: holders?.me ? 700 : 600, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{team?.n ?? row.code}</span>
                        {holders?.me && <span className="wc-tag-you" style={{ fontSize: 8 }}>PICK</span>}
                        {!holders?.me && holders?.count ? <span className="wc-num" style={{ fontSize: 9.5, color: "var(--faint)" }}>{holders.count}♦</span> : null}
                      </span>
                      <span className="wc-num" style={{ width: 28, flex: "none", textAlign: "center", fontSize: 12, color: "var(--dim)", fontWeight: 500 }}>{row.gd > 0 ? `+${row.gd}` : row.gd}</span>
                      <span className="wc-num" style={{ width: 30, flex: "none", textAlign: "center", fontSize: 12, color: "var(--text)", fontWeight: 700 }}>{row.pts}</span>
                    </Link>
                  );
                })}
              </div>
            )) : (
              <div className="wc-card" style={{ padding: 18, color: "var(--dim)" }}>No group data available yet.</div>
            )}
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            <div className="wc-card" style={{ padding: 16 }}>
              <SectionLabel>Next fixtures</SectionLabel>
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {nextFixtures.map((fixture) => (
                  <Link key={fixture.id} href={fixtureHref(fixture.id)} style={{ color: "var(--text)", textDecoration: "none", display: "grid", gap: 4, padding: "10px 0", borderBottom: "1px solid var(--line)", minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, minWidth: 0 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 750, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{T[fixture.a ?? ""]?.f ?? "•"} {T[fixture.a ?? ""]?.n ?? fixture.aName} vs {T[fixture.b ?? ""]?.f ?? "•"} {T[fixture.b ?? ""]?.n ?? fixture.bName}</span>
                      <span className="wc-num" style={{ fontSize: 11, color: "var(--dim)", whiteSpace: "nowrap" }}>{kickoffLabel(fixture.kickoffAt)}</span>
                    </div>
                    <span className="wc-eyebrow">{fixtureStageLabel(fixture.round, fixture.group)}</span>
                  </Link>
                ))}
                {!nextFixtures.length && <div style={{ color: "var(--dim)", fontSize: 13 }}>No upcoming fixtures.</div>}
              </div>
            </div>
            <div className="wc-card" style={{ padding: 16 }}>
              <SectionLabel>Recent results</SectionLabel>
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {recentResults.map((result) => (
                  <Link key={result.id} href={fixtureHref(result.id)} style={{ color: "var(--text)", textDecoration: "none", display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)", minWidth: 0 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 750, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{T[result.a]?.f ?? "•"} {T[result.a]?.n ?? result.a} {result.sa}-{result.sb} {T[result.b]?.f ?? "•"} {T[result.b]?.n ?? result.b}</span>
                    <span className="wc-eyebrow">{result.round}</span>
                  </Link>
                ))}
                {!recentResults.length && <div style={{ color: "var(--dim)", fontSize: 13 }}>No results entered yet.</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
