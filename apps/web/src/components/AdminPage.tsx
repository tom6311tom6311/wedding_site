import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { WeddingContent } from "../content/types";

type AdminPageProps = {
  content: WeddingContent;
};

type AdminContent = WeddingContent["admin"];

type AdminRsvp = {
  id: string;
  name: string;
  email: string;
  phone: string;
  identity: string;
  attendance: string;
  ceremonyAttendance: string;
  guestCount: number;
  message: string;
  createdAt: string;
  updatedAt: string;
  unlockedPhotoIds: string[];
  unlockedCount: number;
};

type AdminOverviewResponse = {
  rsvps: AdminRsvp[];
  activities: AdminActivity[];
  generatedAt: string;
};

type AdminActivity = {
  type: "rsvp_created" | "rsvp_updated" | "puzzle_unlocked";
  rsvpId: string;
  guestName: string;
  photoId: string | null;
  happenedAt: string;
};

type SortKey =
  | "createdAt"
  | "updatedAt"
  | "name"
  | "identity"
  | "attendance"
  | "ceremonyAttendance"
  | "guestCount"
  | "unlockedCount";

type SortDirection = "asc" | "desc";
type AdminTab = "dashboard" | "rsvps" | "puzzle" | "activities";

const RSVP_API_BASE_URL =
  import.meta.env.VITE_RSVP_API_BASE_URL ?? "http://localhost:4000";
const ADMIN_TOKEN_STORAGE_KEY = "wedding-site:admin-token";
const sortableKeys: SortKey[] = [
  "createdAt",
  "updatedAt",
  "name",
  "identity",
  "attendance",
  "ceremonyAttendance",
  "guestCount",
  "unlockedCount",
];
const adminTabs: AdminTab[] = ["dashboard", "rsvps", "puzzle", "activities"];

export function AdminPage({ content }: AdminPageProps) {
  const admin = content.admin;
  const puzzlePhotos = content.puzzle?.photos ?? [];
  const puzzlePhotoTitles = useMemo(
    () => new Map(puzzlePhotos.map((photo) => [photo.id, photo.title])),
    [puzzlePhotos],
  );
  const identityOptions = useMemo(() => getIdentityOptions(content), [content]);
  const [token, setToken] = useState(() =>
    window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY),
  );
  const [password, setPassword] = useState("");
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedRsvps = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;

    return [...(overview?.rsvps ?? [])].sort((first, second) => {
      const result = compareRsvps(first, second, sortKey);

      if (result !== 0) {
        return result * direction;
      }

      return compareRsvps(first, second, "createdAt") * -1;
    });
  }, [overview?.rsvps, sortDirection, sortKey]);

  const sortedDescription = formatTemplate(admin.sortedByLabel, {
    field: admin.fields[sortKey],
    direction: admin.directionLabels[sortDirection],
  });

  const puzzleRows = useMemo(
    () =>
      [...(overview?.rsvps ?? [])].sort((first, second) => {
        if (second.unlockedCount !== first.unlockedCount) {
          return second.unlockedCount - first.unlockedCount;
        }

        return first.name.localeCompare(second.name);
      }),
    [overview?.rsvps],
  );

  const totals = useMemo(() => {
    const rsvps = overview?.rsvps ?? [];
    const attendingRsvps = rsvps.filter((rsvp) => isPositiveAttendance(rsvp.attendance));
    const ceremonyAttendingRsvps = rsvps.filter((rsvp) =>
      isPositiveAttendance(rsvp.ceremonyAttendance),
    );
    const guestCount = rsvps.reduce((total, rsvp) => total + rsvp.guestCount, 0);

    return {
      responses: rsvps.length,
      attendingCount: attendingRsvps.length,
      attendingByIdentity: countByIdentity(attendingRsvps, identityOptions),
      ceremonyAttendingCount: ceremonyAttendingRsvps.length,
      ceremonyAttendingByIdentity: countByIdentity(
        ceremonyAttendingRsvps,
        identityOptions,
      ),
      guestCount,
      puzzleCompletions: rsvps.reduce((total, rsvp) => total + rsvp.unlockedCount, 0),
    };
  }, [identityOptions, overview?.rsvps]);

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadOverview(token);
  }, [token]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoggingIn(true);
    setError(null);

    try {
      const response = await fetch(`${RSVP_API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error("admin-login-failed");
      }

      const body = (await response.json()) as { token: string };

      window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, body.token);
      setPassword("");
      setToken(body.token);
    } catch {
      setError(admin.loginErrorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function loadOverview(nextToken = token) {
    if (!nextToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${RSVP_API_BASE_URL}/api/admin/overview`, {
        headers: {
          Authorization: `Bearer ${nextToken}`,
        },
      });

      if (response.status === 401) {
        window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
        setToken(null);
        setOverview(null);
        throw new Error("admin-session-expired");
      }

      if (!response.ok) {
        throw new Error("admin-load-failed");
      }

      setOverview((await response.json()) as AdminOverviewResponse);
    } catch {
      setError(admin.loadErrorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  function updateSort(nextSortKey: SortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === "name" ? "asc" : "desc");
  }

  function logout() {
    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    setToken(null);
    setOverview(null);
    setError(null);
  }

  function exportRsvpsCsv() {
    downloadCsv(admin.rsvp.csvFileName, createRsvpCsv(sortedRsvps, admin));
  }

  if (!token) {
    return (
      <main className="admin-page admin-page--login">
        <form className="admin-login" onSubmit={handleLogin}>
          <span className="admin-kicker">{admin.kicker}</span>
          <h1>{admin.title}</h1>
          <label>
            <span>{admin.passwordLabel}</span>
            <input
              autoComplete="current-password"
              autoFocus
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="admin-status admin-status--error">{error}</p> : null}
          <button disabled={isLoggingIn || password.trim().length === 0} type="submit">
            {isLoggingIn ? admin.signingInLabel : admin.signInLabel}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <span className="admin-kicker">{admin.kicker}</span>
          <h1>{admin.title}</h1>
          <p>
            {overview
              ? formatTemplate(admin.lastRefreshedLabel, {
                  time: formatDateTime(overview.generatedAt),
                })
              : admin.loadingGuestDataLabel}
          </p>
        </div>
        <div className="admin-header__actions">
          <button type="button" onClick={() => void loadOverview()}>
            {admin.refreshLabel}
          </button>
          <button type="button" onClick={logout}>
            {admin.signOutLabel}
          </button>
        </div>
      </header>

      {error ? <p className="admin-status admin-status--error">{error}</p> : null}
      {isLoading && !overview ? <p className="admin-status">{admin.loadingLabel}</p> : null}

      {overview ? (
        <>
          <nav className="admin-tabs" aria-label={admin.title}>
            {adminTabs.map((tab) => (
              <button
                className={activeTab === tab ? "admin-tab admin-tab--active" : "admin-tab"}
                key={tab}
                type="button"
                aria-current={activeTab === tab ? "page" : undefined}
                onClick={() => setActiveTab(tab)}
              >
                {admin.tabs[tab]}
              </button>
            ))}
          </nav>

          {activeTab === "dashboard" ? (
            <section className="admin-summary" aria-label={admin.summaryAriaLabel}>
              <AdminMetric label={admin.metrics.responses} value={totals.responses} />
              <AdminMetric
                label={admin.metrics.attending}
                value={totals.attendingCount}
                breakdown={totals.attendingByIdentity}
              />
              <AdminMetric
                label={admin.metrics.ceremonyAttending}
                value={totals.ceremonyAttendingCount}
                breakdown={totals.ceremonyAttendingByIdentity}
              />
              <AdminMetric label={admin.metrics.additionalGuests} value={totals.guestCount} />
              <AdminMetric label={admin.metrics.puzzleSolves} value={totals.puzzleCompletions} />
            </section>
          ) : null}

          {activeTab === "rsvps" ? (
          <section className="admin-panel">
            <div className="admin-panel__heading">
              <div>
                <h2>{admin.rsvp.title}</h2>
                <p>
                  {admin.rsvp.sortedDescription} {sortedDescription}
                </p>
              </div>
              <button
                className="admin-panel__action"
                type="button"
                disabled={sortedRsvps.length === 0}
                onClick={exportRsvpsCsv}
              >
                {admin.rsvp.exportCsvLabel}
              </button>
            </div>
            <div className="admin-mobile-controls">
              <label>
                <span>{admin.rsvp.mobileSortLabel}</span>
                <select
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value as SortKey)}
                >
                  {sortableKeys.map((key) => (
                    <option key={key} value={key}>
                      {admin.fields[key]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{admin.rsvp.mobileDirectionLabel}</span>
                <select
                  value={sortDirection}
                  onChange={(event) => setSortDirection(event.target.value as SortDirection)}
                >
                  <option value="desc">{admin.directionLabels.desc}</option>
                  <option value="asc">{admin.directionLabels.asc}</option>
                </select>
              </label>
            </div>
            <div className="admin-rsvp-cards">
              {sortedRsvps.map((rsvp) => (
                <article
                  className="admin-rsvp-card"
                  key={rsvp.id}
                  aria-label={formatTemplate(admin.rsvp.cardAriaLabel, {
                    name: rsvp.name,
                  })}
                >
                  <div className="admin-rsvp-card__header">
                    <div>
                      <h3>{rsvp.name}</h3>
                      <p>{emptyFallback(rsvp.identity, admin)}</p>
                    </div>
                    <strong>
                      {formatTemplate(admin.puzzle.progressFormat, {
                        count: String(rsvp.unlockedCount),
                        total: String(puzzlePhotos.length),
                      })}
                    </strong>
                  </div>
                  <dl>
                    <AdminDetail
                      label={admin.fields.attendance}
                      value={rsvp.attendance}
                      admin={admin}
                    />
                    <AdminDetail
                      label={admin.fields.ceremonyAttendance}
                      value={rsvp.ceremonyAttendance}
                      admin={admin}
                    />
                    <AdminDetail
                      label={admin.fields.guestCount}
                      value={String(rsvp.guestCount)}
                      admin={admin}
                    />
                    <AdminDetail label={admin.fields.phone} value={rsvp.phone} admin={admin} />
                    <AdminDetail label={admin.fields.email} value={rsvp.email} admin={admin} />
                    <AdminDetail
                      label={admin.fields.createdAt}
                      value={formatDateTime(rsvp.createdAt)}
                      admin={admin}
                    />
                    <AdminDetail
                      label={admin.fields.message}
                      value={rsvp.message}
                      admin={admin}
                      wide
                    />
                  </dl>
                </article>
              ))}
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <SortableHeader
                      label={admin.fields.createdAt}
                      sortKey="createdAt"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      directionLabels={admin.directionLabels}
                      onSort={updateSort}
                    />
                    <SortableHeader
                      label={admin.fields.name}
                      sortKey="name"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      directionLabels={admin.directionLabels}
                      onSort={updateSort}
                    />
                    <SortableHeader
                      label={admin.fields.identity}
                      sortKey="identity"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      directionLabels={admin.directionLabels}
                      onSort={updateSort}
                    />
                    <SortableHeader
                      label={admin.fields.attendance}
                      sortKey="attendance"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      directionLabels={admin.directionLabels}
                      onSort={updateSort}
                    />
                    <SortableHeader
                      label={admin.fields.ceremonyAttendance}
                      sortKey="ceremonyAttendance"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      directionLabels={admin.directionLabels}
                      onSort={updateSort}
                    />
                    <SortableHeader
                      label={admin.fields.guestCount}
                      sortKey="guestCount"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      directionLabels={admin.directionLabels}
                      onSort={updateSort}
                    />
                    <SortableHeader
                      label={admin.fields.unlockedCount}
                      sortKey="unlockedCount"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      directionLabels={admin.directionLabels}
                      onSort={updateSort}
                    />
                    <th>{admin.fields.phone}</th>
                    <th>{admin.fields.email}</th>
                    <th>{admin.fields.message}</th>
                    <SortableHeader
                      label={admin.fields.updatedAt}
                      sortKey="updatedAt"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      directionLabels={admin.directionLabels}
                      onSort={updateSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {sortedRsvps.map((rsvp) => (
                    <tr key={rsvp.id}>
                      <td>{formatDateTime(rsvp.createdAt)}</td>
                      <td>{rsvp.name}</td>
                      <td>{emptyFallback(rsvp.identity, admin)}</td>
                      <td>{emptyFallback(rsvp.attendance, admin)}</td>
                      <td>{emptyFallback(rsvp.ceremonyAttendance, admin)}</td>
                      <td>{rsvp.guestCount}</td>
                      <td>{rsvp.unlockedCount}</td>
                      <td>{rsvp.phone}</td>
                      <td>{emptyFallback(rsvp.email, admin)}</td>
                      <td className="admin-table__message">
                        {emptyFallback(rsvp.message, admin)}
                      </td>
                      <td>{formatDateTime(rsvp.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          ) : null}

          {activeTab === "puzzle" ? (
          <section className="admin-panel">
            <div className="admin-panel__heading">
              <h2>{admin.puzzle.title}</h2>
              <p>{admin.puzzle.description}</p>
            </div>
            <section className="admin-leaderboard" aria-labelledby="admin-puzzle-leaderboard-title">
              <div className="admin-leaderboard__heading">
                <h3 id="admin-puzzle-leaderboard-title">
                  {admin.puzzle.leaderboardTitle}
                </h3>
                <p>{admin.puzzle.leaderboardDescription}</p>
              </div>
              <ol className="admin-leaderboard__list">
                {puzzleRows.map((rsvp, index) => (
                  <li className="admin-leaderboard__item" key={rsvp.id}>
                    <span className="admin-leaderboard__rank">
                      {formatTemplate(admin.puzzle.leaderboardRankLabel, {
                        rank: String(index + 1),
                      })}
                    </span>
                    <strong>{rsvp.name}</strong>
                    <span>
                      {formatTemplate(admin.puzzle.progressFormat, {
                        count: String(rsvp.unlockedCount),
                        total: String(puzzlePhotos.length),
                      })}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
            <div className="admin-progress-wrap">
              <table className="admin-progress-table">
                <thead>
                  <tr>
                    <th className="admin-progress-table__guest">{admin.fields.name}</th>
                    <th>{admin.fields.unlockedCount}</th>
                    {puzzlePhotos.map((photo, index) => (
                      <th key={photo.id} title={photo.title}>
                        {index + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {puzzleRows.map((rsvp) => {
                    const solvedSet = new Set(rsvp.unlockedPhotoIds);

                    return (
                      <tr key={rsvp.id}>
                        <th className="admin-progress-table__guest" scope="row">
                          {rsvp.name}
                        </th>
                        <td>
                          {formatTemplate(admin.puzzle.progressFormat, {
                            count: String(rsvp.unlockedCount),
                            total: String(puzzlePhotos.length),
                          })}
                        </td>
                        {puzzlePhotos.map((photo) => {
                          const isSolved = solvedSet.has(photo.id);

                          return (
                            <td key={photo.id}>
                              <span
                                aria-label={
                                  isSolved
                                    ? admin.puzzle.solvedAriaLabel
                                    : admin.puzzle.unsolvedAriaLabel
                                }
                                className={
                                  isSolved
                                    ? "admin-progress-mark admin-progress-mark--solved"
                                    : "admin-progress-mark"
                                }
                                title={photo.title}
                              >
                                {isSolved ? "✓" : ""}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          ) : null}

          {activeTab === "activities" ? (
            <section className="admin-panel">
              <div className="admin-panel__heading">
                <h2>{admin.activities.title}</h2>
                <p>{admin.activities.description}</p>
              </div>
              <div className="admin-activity-list">
                {overview.activities.length > 0 ? (
                  overview.activities.map((activity) => (
                    <article
                      className="admin-activity"
                      key={`${activity.type}:${activity.rsvpId}:${activity.photoId ?? ""}:${activity.happenedAt}`}
                      aria-label={formatTemplate(admin.activities.itemAriaLabel, {
                        name: activity.guestName,
                        type: getActivityTypeLabel(activity, admin),
                      })}
                    >
                      <p className="admin-activity__sentence">
                        {formatActivitySentence(activity, admin, puzzlePhotoTitles)}
                      </p>
                      <time dateTime={activity.happenedAt}>
                        {formatDateTime(activity.happenedAt)}
                      </time>
                    </article>
                  ))
                ) : (
                  <p className="admin-activity-list__empty">
                    {admin.activities.emptyLabel}
                  </p>
                )}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}

function AdminMetric({
  label,
  value,
  breakdown,
}: {
  label: string;
  value: number;
  breakdown?: Array<{ label: string; value: number }>;
}) {
  return (
    <div className="admin-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {breakdown ? (
        <dl className="admin-metric__breakdown">
          {breakdown.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function AdminDetail({
  label,
  value,
  admin,
  wide = false,
}: {
  label: string;
  value: string;
  admin: AdminContent;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "admin-rsvp-card__detail admin-rsvp-card__detail--wide" : "admin-rsvp-card__detail"}>
      <dt>{label}</dt>
      <dd>{emptyFallback(value, admin)}</dd>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  directionLabels,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortDirection: SortDirection;
  directionLabels: AdminContent["directionLabels"];
  onSort: (sortKey: SortKey) => void;
}) {
  const isActive = sortKey === activeSortKey;

  return (
    <th>
      <button
        className={isActive ? "admin-sort admin-sort--active" : "admin-sort"}
        type="button"
        onClick={() => onSort(sortKey)}
      >
        {label}
        {isActive ? <span>{directionLabels[sortDirection]}</span> : null}
      </button>
    </th>
  );
}

function compareRsvps(first: AdminRsvp, second: AdminRsvp, sortKey: SortKey) {
  const firstValue = first[sortKey];
  const secondValue = second[sortKey];

  if (typeof firstValue === "number" && typeof secondValue === "number") {
    return firstValue - secondValue;
  }

  if (sortKey === "createdAt" || sortKey === "updatedAt") {
    return new Date(firstValue).getTime() - new Date(secondValue).getTime();
  }

  return String(firstValue).localeCompare(String(secondValue), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function emptyFallback(value: string, admin: AdminContent) {
  return value.trim() || admin.emptyValue;
}

function formatTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}

function getActivityTypeLabel(activity: AdminActivity, admin: AdminContent) {
  if (activity.type === "rsvp_created") {
    return admin.activities.typeLabels.rsvpCreated;
  }

  if (activity.type === "rsvp_updated") {
    return admin.activities.typeLabels.rsvpUpdated;
  }

  return admin.activities.typeLabels.puzzleUnlocked;
}

function formatActivitySentence(
  activity: AdminActivity,
  admin: AdminContent,
  puzzlePhotoTitles: Map<string, string>,
) {
  if (activity.type === "rsvp_created") {
    return formatTemplate(admin.activities.sentenceTemplates.rsvpCreated, {
      name: activity.guestName,
    });
  }

  if (activity.type === "rsvp_updated") {
    return formatTemplate(admin.activities.sentenceTemplates.rsvpUpdated, {
      name: activity.guestName,
    });
  }

  return formatTemplate(admin.activities.sentenceTemplates.puzzleUnlocked, {
    name: activity.guestName,
    puzzle: activity.photoId
      ? (puzzlePhotoTitles.get(activity.photoId) ?? admin.activities.unknownPuzzleLabel)
      : admin.activities.unknownPuzzleLabel,
  });
}

function createRsvpCsv(rsvps: AdminRsvp[], admin: AdminContent) {
  const headers = [
    admin.fields.createdAt,
    admin.fields.updatedAt,
    admin.fields.name,
    admin.fields.identity,
    admin.fields.attendance,
    admin.fields.ceremonyAttendance,
    admin.fields.guestCount,
    admin.fields.unlockedCount,
    admin.fields.phone,
    admin.fields.email,
    admin.fields.message,
  ];
  const rows = rsvps.map((rsvp) => [
    formatDateTime(rsvp.createdAt),
    formatDateTime(rsvp.updatedAt),
    rsvp.name,
    emptyFallback(rsvp.identity, admin),
    emptyFallback(rsvp.attendance, admin),
    emptyFallback(rsvp.ceremonyAttendance, admin),
    String(rsvp.guestCount),
    String(rsvp.unlockedCount),
    rsvp.phone,
    emptyFallback(rsvp.email, admin),
    emptyFallback(rsvp.message, admin),
  ]);

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");
}

function escapeCsvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadCsv(fileName: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getIdentityOptions(content: WeddingContent) {
  const identityField = content.rsvp.fields.find((field) => field.name === "identity");

  return identityField?.options ?? [];
}

function countByIdentity(rsvps: AdminRsvp[], identityOptions: string[]) {
  return identityOptions.map((identity) => ({
    label: identity,
    value: rsvps.filter((rsvp) => rsvp.identity === identity).length,
  }));
}

function isPositiveAttendance(value: string) {
  const normalized = value.trim().toLowerCase();

  if (
    normalized.includes("not") ||
    normalized.includes("no") ||
    normalized.includes("unable") ||
    normalized.includes("無法") ||
    normalized.includes("不")
  ) {
    return false;
  }

  return (
    normalized.includes("attend") ||
    normalized.includes("yes") ||
    normalized.includes("出席") ||
    normalized.includes("參加")
  );
}
