"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { T, type PlayerTeam } from "@/lib/data";

type TeamLike = Pick<PlayerTeam, "code" | "name" | "flag"> | { code: string | null; name?: string | null; flag?: string | null };

export function teamHref(code: string) {
  return `/team/${encodeURIComponent(code)}`;
}

export function fixtureHref(id: string) {
  return `/fixtures/${encodeURIComponent(id)}`;
}

function eventGuard(e: { stopPropagation: () => void }) {
  e.stopPropagation();
}

export function TeamEntityLink({
  team,
  code,
  children,
  className,
  style,
  stopPropagation = true,
  title,
}: {
  team?: TeamLike | null;
  code?: string | null;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  stopPropagation?: boolean;
  title?: string;
}) {
  const teamCode = code ?? team?.code ?? null;
  if (!teamCode || !T[teamCode]) {
    return (
      <span className={className} style={style} title={title}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={teamHref(teamCode)}
      className={className}
      style={{ color: "inherit", textDecoration: "none", ...style }}
      title={title ?? `Open ${T[teamCode].n}`}
      onClick={stopPropagation ? eventGuard : undefined}
      onPointerDown={stopPropagation ? eventGuard : undefined}
    >
      {children}
    </Link>
  );
}
