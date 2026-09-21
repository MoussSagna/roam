export type ItineraryStep = {
  id: string;
  placeId: string;
  /** 0-based position in the itinerary. */
  order: number;
  durationMin: number;
  travelMinFromPrevious?: number;
  estimatedCost?: number;
};

export type Itinerary = {
  id: string;
  experienceId: string;
  steps: ItineraryStep[];
  totalDurationMin: number;
  totalDistanceKm: number;
};
