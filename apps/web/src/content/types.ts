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
    body: string[];
    illustration?: ImageAsset;
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
    milestones: Array<{
      year: string;
      title: string;
      body: string;
    }>;
  };
  venue: {
    title: string;
    name: string;
    address: string;
    mapUrl: string;
    notes: string[];
    directions: Array<{
      title: string;
      body: string;
    }>;
  };
  schedule: {
    eyebrow: string;
    title: string;
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
  rsvp: {
    title: string;
    subtitle: string;
    submitLabel: string;
    fields: Array<{
      name: string;
      label: string;
      type: "text" | "email" | "tel" | "number" | "textarea" | "select";
      placeholder?: string;
      options?: string[];
    }>;
  };
};
