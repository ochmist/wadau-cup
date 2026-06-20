"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageHead, SectionLabel } from "@/components/ui";
import { fixtureHref, teamHref } from "@/components/entity-links";
import { T } from "@/lib/data";
import { fixtureStageLabel } from "@/lib/fixtures";
import { useFixtures } from "@/hooks/useFixtures";
import { useResults } from "@/hooks/useResults";
import { useTeamProfiles } from "@/hooks/useTeamProfiles";
import type { ResultWithId } from "@/lib/firestore";

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
  const { fixtures, loading: fixturesLoading } = useFixtures();
  const { results, loading: resultsLoading } = useResults();
  const { teams: profiles } = useTeamProfiles();

  const groupMap = useMemo(() => {
    const groups = new Map<string, Set<string>>();
    for (const profile of profiles) {
      if (!profile.group) continue;
      if (!groups.has(profile.group)) groups.set(profile.group, new Set());
      groups.get(profile.group)?.add(profile.code);
    }
    for (const fixture of fixtures) {
      if (!fixture.group) continue;
      if (!groups.has(fixture.group)) groups.set(fixture.group, new Set());
      if (fixture.a) groups.get(fixture.group)?.add(fixture.a);
      if (fixture.b) groups.get(fixture.group)?.add(fixture.b);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [fixtures, profiles]);

  const rowsByGroup = useMemo(() => {
    return groupMap.map(([group, codes]) => {
      const rows = new Map<string, TableRow>();
      codes.forEach((code) => rows.set(code, blankRow(code)));
      for (const result of results) {
        const fixture = fixtures.find((item) => item.id === result.id);
        if (fixture?.group !== group) continue;
        if (result.a && rows.has(result.a)) applyResult(rows.get(result.a)!, result, "a");
        if (result.b && rows.has(result.b)) applyResult(rows.get(result.b)!, result, "b");
      }
      return {
        group,
        rows: Array.from(rows.values()).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || T[a.code]?.n.localeCompare(T[b.code]?.n ?? "") || 0),
      };
    });
  }, [fixtures, groupMap, results]);

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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "15px 16px", borderBottom: "1px solid var(--line)" }}>
                  <SectionLabel>Group {group}</SectionLabel>
                  <span className="wc-num" style={{ fontSize: 12, color: "var(--dim)" }}>{rows.length} teams</span>
                </div>
                <div className="wc-worldcup-table-row" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 34px 34px 34px 42px", gap: 8, padding: "9px 12px", borderBottom: "1px solid var(--line)" }}>
                  {["Team", "P", "GD", "GF", "Pts"].map((label, index) => (
                    <span key={label} className="wc-eyebrow" style={{ textAlign: index === 0 ? "left" : "right" }}>{label}</span>
                  ))}
                </div>
                {rows.map((row) => {
                  const team = T[row.code];
                  return (
                    <Link
                      key={row.code}
                      href={teamHref(row.code)}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) 34px 34px 34px 42px",
                        gap: 8,
                        padding: "10px 12px",
                        color: "var(--text)",
                        textDecoration: "none",
                        borderBottom: "1px solid var(--line)",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span className="wc-flag" style={{ width: 23, height: 23, fontSize: 14 }}>{team?.f ?? "•"}</span>
                        <span style={{ fontWeight: 750, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team?.n ?? row.code}</span>
                      </span>
                      {[row.played, row.gd, row.gf, row.pts].map((value, index) => (
                        <span key={index} className="wc-num" style={{ textAlign: "right", fontSize: 12.5, color: index === 3 ? "var(--lime-ink)" : "var(--dim)", fontWeight: index === 3 ? 800 : 600 }}>{value}</span>
                      ))}
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
