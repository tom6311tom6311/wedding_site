export type HeroAction = {
  label: string;
  href: string;
  variant: "primary" | "secondary";
};

export type HeroImage = {
  src: string;
  alt: string;
  objectPosition?: string;
};

export type ImageAsset = {
  src: string;
  alt: string;
  objectPosition?: string;
  fit?: "cover" | "contain";
  scale?: number;
  offsetY?: string;
};

export type WeddingContent = {
  metadata: {
    title: string;
    description: string;
  };
  music?: {
    enabled: boolean;
    src: string;
    title: string;
    loop?: boolean;
    volume?: number;
    consent: {
      eyebrow: string;
      title: string;
      description: string;
      acceptLabel: string;
      dismissLabel: string;
      playAriaLabel: string;
      pauseAriaLabel: string;
    };
  };
  hero: {
    eyebrow: string;
    coupleNames: {
      groom: string;
      bride: string;
      symbol: string;
    };
    dateLine: string;
    message: string;
    image: HeroImage;
    images?: HeroImage[];
    carousel: {
      intervalMs: number;
    };
    actions: HeroAction[];
  };
  welcome: {
    eyebrow: string;
    title: string;
    featureImage?: ImageAsset;
    body: string[];
  };
  countdown: {
    eyebrow: string;
    title: string;
    subtitle: string;
    targetDate: string;
    dateLine: string;
    completedLabel: string;
    units: {
      days: string;
      hours: string;
      minutes: string;
      seconds: string;
    };
  };
  couple: {
    eyebrow: string;
    title: string;
    people: Array<{
      role: string;
      name: string;
      introduction?: string;
      image: ImageAsset;
      parents?: {
        title: string;
        image: ImageAsset;
        dad: {
          label: string;
          name: string;
          introduction: string;
        };
        mom: {
          label: string;
          name: string;
          introduction: string;
        };
      };
    }>;
  };
  story: {
    eyebrow: string;
    title: string;
    cover?: {
      image: ImageAsset;
      openAriaLabel: string;
    };
    controls: {
      label: string;
      previousAriaLabel: string;
      nextAriaLabel: string;
    };
    fallbackImages: ImageAsset[];
    milestones: Array<{
      year: string;
      title: string;
      body: string | string[];
      images?: ImageAsset[];
    }>;
  };
  venue: {
    title: string;
    name: string;
    address: string;
    mapUrl: string;
    mapLabel: string;
    mapAriaLabel: string;
    notes: string[];
    directions: Array<{
      title: string;
      body: string;
    }>;
  };
  schedule: {
    eyebrow: string;
    title: string;
    endingLabel: string;
    imageOpenAriaLabel: string;
    imageCloseAriaLabel: string;
    events: Array<{
      time: string;
      title: string;
      body: string;
      images?: Array<{
        src: string;
        alt: string;
      }>;
    }>;
  };
  puzzle?: {
    eyebrow: string;
    title: string;
    subtitle: string;
    lockedLabel: string;
    unlockedLabel: string;
    startLabel: string;
    continueLabel: string;
    identifyTitle: string;
    identifyBody: string;
    rsvpLinkLabel: string;
    solveTitle: string;
    solveBody: string;
    difficultyTiers: Array<{
      startsAt: number;
      rows: number;
      columns: number;
    }>;
    labels: {
      rankUnavailable: string;
      rankFormat: string;
      progressLabel: string;
      solvedCount: string;
      solvedCountWithTotal: string;
      firstRankMessage: string;
      firstRankLeadMessage: string;
      nextRankMessage: string;
      joinRankMessage: string;
      closetButton: string;
      namePlaceholder: string;
      phonePlaceholder: string;
      identifySubmitLabel: string;
      identifyingLabel: string;
      identifyValidationMessages: {
        name: string;
        phone: string;
      };
      identifyDefaultValidationMessage: string;
      identifyNotFoundMessage: string;
      identifyErrorMessage: string;
      unlockErrorMessage: string;
      closeLabel: string;
      tileAriaLabel: string;
      nextPhotoLabel: string;
      allSolvedTitle: string;
      allSolvedBody: string;
      closetTitle: string;
      closetSummary: string;
      closetSummaryWithTotal: string;
      closetEmpty: string;
    };
    photos: Array<{
      id: string;
      title: string;
      src: string;
      alt: string;
      hint?: string;
    }>;
  };
  rsvp: {
    title: string;
    subtitle: string;
    submitLabel: string;
    submittingLabel: string;
    updateLabel: string;
    validationMessages: {
      phone: string;
      email: string;
      required: string;
    };
    statusMessages: {
      duplicate: string;
      submitSuccess: string;
      updateSuccess: string;
      submitError: string;
    };
    selectPlaceholder: string;
    requiredAriaLabel: string;
    fields: Array<{
      name: string;
      label: string;
      type: "text" | "email" | "tel" | "number" | "textarea" | "select";
      placeholder?: string;
      options?: string[];
      required?: boolean;
    }>;
  };
};
