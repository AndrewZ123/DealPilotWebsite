/** Core TypeScript types for DealPilot */

export interface Deal {
  id: string;
  slug: string;
  title: string;
  description: string;
  store: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  category: string;
  imageUrl: string;
  finalUrl: string;
  clicks: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Shape returned by public API — never exposes finalUrl directly */
export type DealPublic = Omit<Deal, "finalUrl">;

export interface ClickLog {
  id: string;
  dealId: string;
  referer: string;
  userAgent: string;
  ip: string;
  createdAt: Date;
}

export interface Category {
  name: string;
  slug: string;
  icon: string;
}

/** Payload for creating a new deal via admin API */
export interface CreateDealInput {
  title: string;
  description: string;
  store: string;
  originalPrice: number;
  salePrice: number;
  category: string;
  imageUrl?: string;
  finalUrl: string;
}

/** Payload for updating a deal via admin API */
export interface UpdateDealInput extends Partial<CreateDealInput> {
  active?: boolean;
}