import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { WeddingContent } from "../content/types";

type PuzzleContent = NonNullable<WeddingContent["puzzle"]>;
type PuzzlePhoto = PuzzleContent["photos"][number];
type PuzzleDifficultyTier = PuzzleContent["difficultyTiers"][number];

type PuzzleDimensions = {
  rows: number;
  columns: number;
};

type PuzzleSectionProps = {
  puzzle: PuzzleContent;
};

type PuzzleGuest = {
  name: string;
};

type PuzzleMeResponse = {
  rsvp: PuzzleGuest;
  unlockedPhotoIds: string[];
  puzzleRank: PuzzleRank | null;
};

type PuzzleIdentifyResponse = PuzzleMeResponse & {
  browserToken: string;
};

type ApiErrorResponse = {
  error?: string;
  message?: string;
  fields?: string[];
};

type PuzzleRank = {
  rank: number;
  unlockedCount: number;
  photosToNextRank: number | null;
  photosAheadOfSecondPlace: number | null;
};

type StoredPuzzleState = {
  photoId: string;
  tileOrder: number[];
  selectedTileIndex: number | null;
  dimensions: PuzzleDimensions;
  isSolved: boolean;
};

const RSVP_API_BASE_URL =
  import.meta.env.VITE_RSVP_API_BASE_URL ?? "http://localhost:4000";
const RSVP_BROWSER_TOKEN_STORAGE_KEY = "wedding-site:rsvp-token";
const RSVP_TOKEN_UPDATED_EVENT = "wedding-site:rsvp-token-updated";
const RSVP_RECORD_RESET_EVENT = "wedding-site:rsvp-record-reset";
const PUZZLE_STATE_STORAGE_KEY_PREFIX = "wedding-site:puzzle-state:v3";
const DEFAULT_PUZZLE_DIFFICULTY_TIERS: PuzzleDifficultyTier[] = [
  { startsAt: 1, rows: 2, columns: 3 },
  { startsAt: 11, rows: 3, columns: 4 },
  { startsAt: 31, rows: 4, columns: 5 },
  { startsAt: 51, rows: 5, columns: 6 },
  { startsAt: 71, rows: 6, columns: 7 },
];

export function PuzzleSection({ puzzle }: PuzzleSectionProps) {
  const [guest, setGuest] = useState<PuzzleGuest | null>(null);
  const [unlockedPhotoIds, setUnlockedPhotoIds] = useState<string[]>([]);
  const [puzzleRank, setPuzzleRank] = useState<PuzzleRank | null>(null);
  const [activePhoto, setActivePhoto] = useState<PuzzlePhoto | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<PuzzlePhoto | null>(null);
  const [shouldReturnToCloset, setShouldReturnToCloset] = useState(false);
  const [isClosetOpen, setIsClosetOpen] = useState(false);
  const [tileOrder, setTileOrder] = useState<number[]>([]);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [activePuzzleDimensions, setActivePuzzleDimensions] = useState<PuzzleDimensions>(() =>
    getPuzzleDimensions(puzzle.difficultyTiers, 1),
  );
  const [photoAspects, setPhotoAspects] = useState<Record<string, number>>({});
  const [isSolved, setIsSolved] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [isPuzzleHelpOpen, setIsPuzzleHelpOpen] = useState(false);
  const unlockedSet = useMemo(() => new Set(unlockedPhotoIds), [unlockedPhotoIds]);
  const unlockedPhotos = useMemo(
    () => puzzle.photos.filter((photo) => unlockedSet.has(photo.id)),
    [puzzle.photos, unlockedSet],
  );
  const nextPhoto = puzzle.photos.find((photo) => !unlockedSet.has(photo.id)) ?? null;
  const hasSolvedAll = nextPhoto === null && puzzle.photos.length > 0;
  const nextModalPhoto =
    activePhoto && isSolved
      ? (puzzle.photos.find(
          (photo) => photo.id !== activePhoto.id && !unlockedSet.has(photo.id),
        ) ?? null)
      : null;
  const labels = puzzle.labels;
  const activePhotoAspect = activePhoto ? (photoAspects[activePhoto.id] ?? 4 / 5) : 4 / 5;

  useEffect(() => {
    let cancelled = false;

    async function loadPuzzleState() {
      const browserToken = window.localStorage.getItem(RSVP_BROWSER_TOKEN_STORAGE_KEY);

      if (!browserToken) {
        resetPuzzleSession();
        return;
      }

      try {
        const response = await fetch(`${RSVP_API_BASE_URL}/api/puzzle/me`, {
          headers: {
            Authorization: `Bearer ${browserToken}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const body = (await response.json()) as PuzzleMeResponse;

        if (!cancelled) {
          setGuest(body.rsvp);
          setUnlockedPhotoIds(body.unlockedPhotoIds);
          setPuzzleRank(body.puzzleRank);
        }
      } catch {
        // Puzzle state is optional; guests can identify themselves in the section.
      }
    }

    function handleTokenUpdated() {
      void loadPuzzleState();
    }

    function handleRecordReset() {
      clearAllStoredPuzzleStates();
      resetPuzzleSession();
    }

    void loadPuzzleState();
    window.addEventListener(RSVP_TOKEN_UPDATED_EVENT, handleTokenUpdated);
    window.addEventListener(RSVP_RECORD_RESET_EVENT, handleRecordReset);

    return () => {
      cancelled = true;
      window.removeEventListener(RSVP_TOKEN_UPDATED_EVENT, handleTokenUpdated);
      window.removeEventListener(RSVP_RECORD_RESET_EVENT, handleRecordReset);
    };
  }, []);

  useEffect(() => {
    if (!activePhoto || tileOrder.length === 0) {
      return;
    }

    saveStoredPuzzleState(activePhoto.id, {
      photoId: activePhoto.id,
      tileOrder,
      selectedTileIndex,
      dimensions: activePuzzleDimensions,
      isSolved,
    });
  }, [activePhoto, activePuzzleDimensions, isSolved, selectedTileIndex, tileOrder]);

  useEffect(() => {
    if (!activePhoto || !isSolved) {
      return;
    }

    void unlockPhoto();
  }, [activePhoto, isSolved]);

  useEffect(() => {
    unlockedPhotoIds.forEach((photoId) => clearStoredPuzzleState(photoId));
  }, [unlockedPhotoIds]);

  function resetPuzzleSession() {
    setGuest(null);
    setUnlockedPhotoIds([]);
    setPuzzleRank(null);
    setActivePhoto(null);
    setViewingPhoto(null);
    setShouldReturnToCloset(false);
    setIsClosetOpen(false);
    setTileOrder([]);
    setSelectedTileIndex(null);
    setActivePuzzleDimensions(getPuzzleDimensions(puzzle.difficultyTiers, 1));
    setIsSolved(false);
    setStatus(null);
    setIsIdentifying(false);
    setIsLookupOpen(false);
    setIsPuzzleHelpOpen(false);
  }

  function startPuzzle(photo: PuzzlePhoto, puzzleNumber = unlockedPhotoIds.length + 1) {
    if (!guest) {
      setStatus(puzzle.identifyBody);
      return;
    }

    setStatus(null);
    setIsPuzzleHelpOpen(false);
    setActivePhoto(photo);
    setViewingPhoto(null);

    const storedState = getStoredPuzzleState(photo.id);

    if (storedState) {
      setSelectedTileIndex(storedState.selectedTileIndex);
      setIsSolved(storedState.isSolved);
      setActivePuzzleDimensions(storedState.dimensions);
      setTileOrder(storedState.tileOrder);
      return;
    }

    const nextPuzzleDimensions = getPuzzleDimensions(
      puzzle.difficultyTiers,
      puzzleNumber,
      photoAspects[photo.id],
    );
    const nextTileOrder = createShuffledOrder(getTileCount(nextPuzzleDimensions));

    setSelectedTileIndex(null);
    setIsSolved(false);
    setActivePuzzleDimensions(nextPuzzleDimensions);
    setTileOrder(nextTileOrder);
  }

  function closePuzzle() {
    setIsPuzzleHelpOpen(false);
    setActivePhoto(null);
    setSelectedTileIndex(null);
  }

  function openPhoto(photo: PuzzlePhoto, returnToCloset = false) {
    setViewingPhoto(photo);
    setShouldReturnToCloset(returnToCloset);
  }

  function closeViewingPhoto() {
    setViewingPhoto(null);

    if (shouldReturnToCloset) {
      setIsClosetOpen(true);
    }

    setShouldReturnToCloset(false);
  }

  function startNextModalPuzzle(photo: PuzzlePhoto) {
    const activePhotoIsAlreadyUnlocked = activePhoto ? unlockedSet.has(activePhoto.id) : false;
    const nextPuzzleNumber = unlockedPhotoIds.length + (activePhotoIsAlreadyUnlocked ? 1 : 2);

    startPuzzle(photo, nextPuzzleNumber);
  }

  function rememberPhotoAspect(photo: PuzzlePhoto, image: HTMLImageElement) {
    if (!image.naturalWidth || !image.naturalHeight) {
      return;
    }

    const aspect = image.naturalWidth / image.naturalHeight;

    setPhotoAspects((current) =>
      current[photo.id] === aspect
        ? current
        : {
            ...current,
            [photo.id]: aspect,
          },
    );
  }

  function swapTile(tileIndex: number) {
    if (isSolved) {
      return;
    }

    if (selectedTileIndex === null) {
      setSelectedTileIndex(tileIndex);
      return;
    }

    if (selectedTileIndex === tileIndex) {
      setSelectedTileIndex(null);
      return;
    }

    const nextOrder = [...tileOrder];
    [nextOrder[selectedTileIndex], nextOrder[tileIndex]] = [
      nextOrder[tileIndex],
      nextOrder[selectedTileIndex],
    ];

    setTileOrder(nextOrder);
    setSelectedTileIndex(null);

    if (isComplete(nextOrder)) {
      setIsSolved(true);
    }
  }

  async function unlockPhoto() {
    if (!activePhoto) {
      return;
    }

    const browserToken = window.localStorage.getItem(RSVP_BROWSER_TOKEN_STORAGE_KEY);

    if (!browserToken) {
      setStatus(puzzle.identifyBody);
      return;
    }

    try {
      const response = await fetch(`${RSVP_API_BASE_URL}/api/puzzle/unlocks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${browserToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          photoId: activePhoto.id,
        }),
      });

      if (response.status === 401) {
        setGuest(null);
        setStatus(puzzle.identifyBody);
        return;
      }

      if (!response.ok) {
        throw new Error();
      }

      const body = (await response.json()) as Pick<
        PuzzleMeResponse,
        "unlockedPhotoIds" | "puzzleRank"
      >;
      setUnlockedPhotoIds(body.unlockedPhotoIds);
      setPuzzleRank(body.puzzleRank);
      clearStoredPuzzleState(activePhoto.id);
    } catch {
      setStatus(labels.unlockErrorMessage);
    }
  }

  async function handleIdentify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.reportValidity()) {
      return;
    }

    const formData = new FormData(form);
    setIsIdentifying(true);
    setStatus(null);

    try {
      const response = await fetch(`${RSVP_API_BASE_URL}/api/puzzle/identify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          phone: String(formData.get("phone") ?? ""),
        }),
      });

      if (response.status === 400) {
        const errorBody = (await response.json().catch(() => null)) as ApiErrorResponse | null;

        setStatus(formatIdentifyValidationMessage(errorBody?.fields, labels));
        return;
      }

      if (response.status === 404) {
        setStatus(labels.identifyNotFoundMessage);
        return;
      }

      if (!response.ok) {
        throw new Error();
      }

      const body = (await response.json()) as PuzzleIdentifyResponse;

      window.localStorage.setItem(RSVP_BROWSER_TOKEN_STORAGE_KEY, body.browserToken);
      window.dispatchEvent(new Event(RSVP_TOKEN_UPDATED_EVENT));
      setGuest(body.rsvp);
      setUnlockedPhotoIds(body.unlockedPhotoIds);
      setPuzzleRank(body.puzzleRank);
      setIsLookupOpen(false);
      form.reset();
    } catch {
      setStatus(labels.identifyErrorMessage);
    } finally {
      setIsIdentifying(false);
    }
  }

  return (
    <section className="page-section puzzle-section" id="puzzle">
      <div className="section-inner puzzle-inner">
        <div className="section-heading">
          {puzzle.eyebrow ? <p className="eyebrow">{puzzle.eyebrow}</p> : null}
          <h2>{puzzle.title}</h2>
          <p>{puzzle.subtitle}</p>
        </div>

        {guest ? (
          <div className="puzzle-rank">
            <div>
              <span>{guest.name}</span>
              <strong>
                {puzzleRank
                  ? formatLabel(labels.rankFormat, { rank: puzzleRank.rank })
                  : labels.rankUnavailable}
              </strong>
            </div>
            <div>
              <span>{labels.progressLabel}</span>
              <strong>
                {hasSolvedAll
                  ? formatLabel(labels.solvedCountWithTotal, {
                      count: unlockedPhotoIds.length,
                      total: puzzle.photos.length,
                    })
                  : formatLabel(labels.solvedCount, { count: unlockedPhotoIds.length })}
              </strong>
            </div>
            <p>
              {puzzleRank
                ? puzzleRank.photosToNextRank === null
                  ? puzzleRank.photosAheadOfSecondPlace === null
                    ? labels.firstRankMessage
                    : formatLabel(labels.firstRankLeadMessage, {
                        lead: puzzleRank.photosAheadOfSecondPlace,
                      })
                  : formatLabel(labels.nextRankMessage, { gap: puzzleRank.photosToNextRank })
                : labels.joinRankMessage}
            </p>
            <button type="button" onClick={() => setIsClosetOpen(true)}>
              {labels.closetButton}
            </button>
          </div>
        ) : null}

        {!guest ? (
          <div className="puzzle-identify">
            <div>
              <h3>{puzzle.identifyTitle}</h3>
              <p>{puzzle.identifyBody}</p>
              <div className="puzzle-identify__actions">
                <a className="puzzle-identify__primary" href="#rsvp">
                  {puzzle.rsvpLinkLabel}
                </a>
                <button
                  className="puzzle-identify__secondary"
                  type="button"
                  onClick={() => {
                    setIsLookupOpen((current) => !current);
                    setStatus(null);
                  }}
                >
                  {isLookupOpen ? labels.closeLabel : labels.identifySubmitLabel}
                </button>
              </div>
            </div>
            {isLookupOpen ? (
              <form onSubmit={handleIdentify}>
                <input name="name" placeholder={labels.namePlaceholder} required />
                <input
                  name="phone"
                  placeholder={labels.phonePlaceholder}
                  inputMode="tel"
                  maxLength={13}
                  required
                />
                <button type="submit" disabled={isIdentifying}>
                  {isIdentifying ? labels.identifyingLabel : labels.identifySubmitLabel}
                </button>
              </form>
            ) : null}
          </div>
        ) : null}

        {status ? <p className="puzzle-message">{status}</p> : null}

        {guest ? (
          <div className="puzzle-stage">
            {nextPhoto ? (
              <article className="puzzle-card puzzle-card--next">
                <div className="puzzle-card__body">
                  <h3>{labels.nextPhotoLabel}</h3>
                  <strong>{nextPhoto.title}</strong>
                  {nextPhoto.hint ? <p>{nextPhoto.hint}</p> : null}
                </div>
                <div className="puzzle-card__image">
                  <img
                    src={nextPhoto.src}
                    alt={nextPhoto.alt}
                    onLoad={(event) => rememberPhotoAspect(nextPhoto, event.currentTarget)}
                  />
                  <button
                    className="puzzle-card__start"
                    type="button"
                    onClick={() => startPuzzle(nextPhoto)}
                  >
                    {puzzle.startLabel}
                  </button>
                </div>
              </article>
            ) : (
              <div className="puzzle-complete">
                <h3>{labels.allSolvedTitle}</h3>
                <p>{formatLabel(labels.allSolvedBody, { total: puzzle.photos.length })}</p>
                <button type="button" onClick={() => setIsClosetOpen(true)}>
                  {labels.closetButton}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {activePhoto ? (
        <div className="puzzle-modal" role="dialog" aria-modal="true">
          <div className={`puzzle-modal__panel${isSolved ? " puzzle-modal__panel--solved" : ""}`}>
            <button
              className="puzzle-modal__help"
              type="button"
              aria-label={puzzle.solveTitle}
              onClick={() => setIsPuzzleHelpOpen(true)}
            >
              ?
            </button>
            <button
              className="puzzle-modal__close"
              type="button"
              aria-label={labels.closeLabel}
              onClick={closePuzzle}
            >
              ×
            </button>
            <div className="puzzle-modal__copy">
              <h3>{activePhoto.title}</h3>
              {activePhoto.hint ? <p>{activePhoto.hint}</p> : null}
            </div>
            {isSolved ? (
              <div className="puzzle-congrats" aria-live="polite">
                <div className="puzzle-congrats__burst" aria-hidden="true">
                  {Array.from({ length: 12 }, (_, index) => (
                    <span key={index} />
                  ))}
                </div>
                <strong>{puzzle.unlockedLabel}!</strong>
              </div>
            ) : null}
            <div
              className="puzzle-board"
              style={{
                "--puzzle-photo-aspect": activePhotoAspect,
                gridTemplateColumns: `repeat(${activePuzzleDimensions.columns}, 1fr)`,
                gridTemplateRows: `repeat(${activePuzzleDimensions.rows}, 1fr)`,
                aspectRatio: activePhotoAspect,
              } as CSSProperties}
            >
              {tileOrder.map((sourceIndex, tileIndex) => (
                <button
                  className={`puzzle-tile${
                    selectedTileIndex === tileIndex ? " puzzle-tile--selected" : ""
                  }`}
                  key={`${sourceIndex}-${tileIndex}`}
                  type="button"
                  style={tileStyle(activePhoto.src, sourceIndex, activePuzzleDimensions)}
                  onClick={() => swapTile(tileIndex)}
                  aria-label={formatLabel(labels.tileAriaLabel, { index: tileIndex + 1 })}
                />
              ))}
              {isSolved ? (
                <img
                  className="puzzle-board__solved-photo"
                  src={activePhoto.src}
                  alt=""
                  aria-hidden="true"
                />
              ) : null}
            </div>
            {isSolved ? (
              nextModalPhoto ? (
                <div className="puzzle-modal__next">
                  <div className="puzzle-modal__next-action">
                    <span>{labels.nextPhotoLabel}</span>
                    <strong>{nextModalPhoto.title}</strong>
                    <button
                      className="puzzle-modal__primary"
                      type="button"
                      onClick={() => startNextModalPuzzle(nextModalPhoto)}
                    >
                      {puzzle.startLabel}
                    </button>
                  </div>
                  <img
                    className="puzzle-modal__next-photo"
                    src={nextModalPhoto.src}
                    alt={nextModalPhoto.alt}
                    onLoad={(event) => rememberPhotoAspect(nextModalPhoto, event.currentTarget)}
                  />
                </div>
              ) : (
                <div className="puzzle-modal__next">
                  <div>
                    <strong>{labels.allSolvedTitle}</strong>
                    <p>{formatLabel(labels.allSolvedBody, { total: puzzle.photos.length })}</p>
                  </div>
                </div>
              )
            ) : null}
            {isPuzzleHelpOpen ? (
              <div
                className="puzzle-help"
                role="dialog"
                aria-modal="true"
                aria-labelledby="puzzle-help-title"
                onClick={() => setIsPuzzleHelpOpen(false)}
              >
                <div className="puzzle-help__panel" onClick={(event) => event.stopPropagation()}>
                  <button
                    className="puzzle-modal__close"
                    type="button"
                    aria-label={labels.closeLabel}
                    onClick={() => setIsPuzzleHelpOpen(false)}
                  >
                    ×
                  </button>
                  <h3 id="puzzle-help-title">{puzzle.solveTitle}</h3>
                  <p>{puzzle.solveBody}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {viewingPhoto ? (
        <div
          className="image-viewer"
          role="dialog"
          aria-modal="true"
          onClick={closeViewingPhoto}
        >
          <button
            className="image-viewer__close"
            type="button"
            aria-label={labels.closeLabel}
            onClick={(event) => {
              event.stopPropagation();
              closeViewingPhoto();
            }}
          >
            ×
          </button>
          <img src={viewingPhoto.src} alt={viewingPhoto.alt} onClick={(event) => event.stopPropagation()} />
        </div>
      ) : null}

      {isClosetOpen ? (
        <div
          className="puzzle-closet"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsClosetOpen(false)}
        >
          <div className="puzzle-closet__panel" onClick={(event) => event.stopPropagation()}>
            <button
              className="puzzle-modal__close"
              type="button"
              aria-label={labels.closeLabel}
              onClick={() => setIsClosetOpen(false)}
            >
              ×
            </button>
            <div className="puzzle-modal__copy">
              <h3>{labels.closetTitle}</h3>
              <p>
                {hasSolvedAll
                  ? formatLabel(labels.closetSummaryWithTotal, {
                      count: unlockedPhotoIds.length,
                      total: puzzle.photos.length,
                    })
                  : formatLabel(labels.closetSummary, { count: unlockedPhotoIds.length })}
              </p>
            </div>
            {unlockedPhotos.length > 0 ? (
              <div className="puzzle-closet__grid">
                {unlockedPhotos.map((photo) => (
                  <button
                    className="puzzle-closet__photo"
                    key={photo.id}
                    type="button"
                    onClick={() => {
                      openPhoto(photo, true);
                      setIsClosetOpen(false);
                    }}
                  >
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      onLoad={(event) => rememberPhotoAspect(photo, event.currentTarget)}
                    />
                    <span>{photo.title}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="puzzle-closet__empty">{labels.closetEmpty}</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function createShuffledOrder(tileCount: number): number[] {
  const order = Array.from({ length: tileCount }, (_, index) => index);

  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }

  return isComplete(order) ? createShuffledOrder(tileCount) : order;
}

function formatLabel(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (formatted, [key, value]) => formatted.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function getPuzzleDimensions(
  configuredTiers: PuzzleDifficultyTier[],
  puzzleNumber: number,
  photoAspect?: number,
): PuzzleDimensions {
  const tiers = configuredTiers.length
    ? [...configuredTiers].sort((a, b) => a.startsAt - b.startsAt)
    : DEFAULT_PUZZLE_DIFFICULTY_TIERS;
  const activeTier = tiers.reduce(
    (currentTier, candidateTier) =>
      candidateTier.startsAt <= puzzleNumber ? candidateTier : currentTier,
    tiers[0],
  );

  return getSquareFriendlyDimensions(
    {
      rows: activeTier.rows,
      columns: activeTier.columns,
    },
    photoAspect,
  );
}

function getTileCount(dimensions: PuzzleDimensions) {
  return dimensions.rows * dimensions.columns;
}

function getSquareFriendlyDimensions(
  dimensions: PuzzleDimensions,
  photoAspect?: number,
): PuzzleDimensions {
  if (!photoAspect || !Number.isFinite(photoAspect) || dimensions.rows === dimensions.columns) {
    return dimensions;
  }

  const swappedDimensions = {
    rows: dimensions.columns,
    columns: dimensions.rows,
  };

  return getTileAspectDistance(dimensions, photoAspect) <=
    getTileAspectDistance(swappedDimensions, photoAspect)
    ? dimensions
    : swappedDimensions;
}

function getTileAspectDistance(dimensions: PuzzleDimensions, photoAspect: number) {
  const tileAspect = photoAspect * (dimensions.rows / dimensions.columns);

  return Math.abs(Math.log(tileAspect));
}

function getStoredPuzzleState(photoId: string): StoredPuzzleState | null {
  try {
    const rawState = window.localStorage.getItem(getPuzzleStateStorageKey(photoId));

    if (!rawState) {
      return null;
    }

    const parsedState = JSON.parse(rawState) as Partial<StoredPuzzleState>;
    const dimensions = parsedState.dimensions;

    if (!isPuzzleDimensions(dimensions)) {
      clearStoredPuzzleState(photoId);
      return null;
    }

    const expectedTileCount = getTileCount(dimensions);
    const tileSet = new Set(parsedState.tileOrder);

    if (
      parsedState.photoId !== photoId ||
      !Array.isArray(parsedState.tileOrder) ||
      parsedState.tileOrder.length !== expectedTileCount ||
      tileSet.size !== expectedTileCount ||
      parsedState.tileOrder.some(
        (tile) => !Number.isInteger(tile) || tile < 0 || tile >= expectedTileCount,
      ) ||
      (parsedState.selectedTileIndex !== null &&
        parsedState.selectedTileIndex !== undefined &&
        (!Number.isInteger(parsedState.selectedTileIndex) ||
          parsedState.selectedTileIndex < 0 ||
          parsedState.selectedTileIndex >= expectedTileCount))
    ) {
      clearStoredPuzzleState(photoId);
      return null;
    }

    const tileOrder = parsedState.tileOrder as number[];

    return {
      photoId,
      tileOrder,
      selectedTileIndex:
        typeof parsedState.selectedTileIndex === "number"
          ? parsedState.selectedTileIndex
          : null,
      dimensions,
      isSolved: parsedState.isSolved === true,
    };
  } catch {
    clearStoredPuzzleState(photoId);
    return null;
  }
}

function saveStoredPuzzleState(photoId: string, state: StoredPuzzleState) {
  try {
    window.localStorage.setItem(getPuzzleStateStorageKey(photoId), JSON.stringify(state));
  } catch {
    // Local puzzle progress is best-effort; the game remains playable without it.
  }
}

function clearStoredPuzzleState(photoId: string) {
  try {
    window.localStorage.removeItem(getPuzzleStateStorageKey(photoId));
  } catch {
    // Ignore storage failures.
  }
}

function clearAllStoredPuzzleStates() {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(`${PUZZLE_STATE_STORAGE_KEY_PREFIX}:`))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Ignore storage failures.
  }
}

function formatIdentifyValidationMessage(
  fields: string[] | undefined,
  labels: PuzzleContent["labels"],
) {
  const messages = Array.from(new Set(fields ?? []))
    .map((field) =>
      field === "name" || field === "phone"
        ? labels.identifyValidationMessages[field]
        : null,
    )
    .filter((message): message is string => Boolean(message));

  return messages.join(" ") || labels.identifyDefaultValidationMessage;
}

function getPuzzleStateStorageKey(photoId: string) {
  return `${PUZZLE_STATE_STORAGE_KEY_PREFIX}:${photoId}`;
}

function isComplete(order: number[]) {
  return order.every((sourceIndex, tileIndex) => sourceIndex === tileIndex);
}

function isPuzzleDimensions(value: unknown): value is PuzzleDimensions {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const dimensions = value as Partial<PuzzleDimensions>;

  return (
    Number.isInteger(dimensions.rows) &&
    Number.isInteger(dimensions.columns) &&
    Number(dimensions.rows) > 0 &&
    Number(dimensions.columns) > 0
  );
}

function tileStyle(src: string, sourceIndex: number, dimensions: PuzzleDimensions) {
  const column = sourceIndex % dimensions.columns;
  const row = Math.floor(sourceIndex / dimensions.columns);
  const maxColumnOffset = dimensions.columns - 1;
  const maxRowOffset = dimensions.rows - 1;

  return {
    backgroundImage: `url(${src})`,
    backgroundPosition: `${
      maxColumnOffset === 0 ? 0 : (column / maxColumnOffset) * 100
    }% ${maxRowOffset === 0 ? 0 : (row / maxRowOffset) * 100}%`,
    backgroundSize: `${dimensions.columns * 100}% ${dimensions.rows * 100}%`,
  };
}
