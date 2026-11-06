export type RecordCategory = "recipe" | "ingredient" | "market" | "knowledge-bearer" | "legal-protection";
export type VerificationStatus = "draft" | "in-review" | "verified" | "rejected";
export type DataSourceType = "fieldwork" | "archive" | "interview" | "institution" | "community";

export interface Municipality {
  id: string;
  inegiCode: string;
  name: string;
  stateCode: "21";
  population?: number;
}

export interface GastronomicRecord {
  id: string;
  category: RecordCategory;
  name: string;
  description?: string;
  municipalityId: string;
  sourceId: string;
  verificationStatus: VerificationStatus;
  completenessScore: number;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  tags: string[];
}

export interface Recipe extends GastronomicRecord {
  category: "recipe";
  ingredientIds: string[];
  preparation?: string;
  occasion?: string;
}

export interface Ingredient extends GastronomicRecord {
  category: "ingredient";
  scientificName?: string;
  seasonality?: string[];
  origin?: string;
}

export interface Market extends GastronomicRecord {
  category: "market";
  marketType: "market" | "tianguis";
  address?: string;
  latitude?: number;
  longitude?: number;
  operatingDays?: string[];
}

export interface KnowledgeBearer extends GastronomicRecord {
  category: "knowledge-bearer";
  displayName: string;
  community?: string;
  specialty?: string[];
  consentToPublish: boolean;
}

export interface LegalProtection extends GastronomicRecord {
  category: "legal-protection";
  protectionType: string;
  authority?: string;
  registrationNumber?: string;
  validFrom?: string;
  validUntil?: string;
}

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  reference?: string;
  collectedAt?: string;
}

export interface VerificationEvent {
  id: string;
  recordId: string;
  status: VerificationStatus;
  reviewerId?: string;
  notes?: string;
  createdAt: string;
}

export interface QualitySnapshot {
  id: string;
  period: string;
  completeness: number;
  verification: number;
  consistency: number;
  freshness: number;
  calculatedAt: string;
}

export interface DashboardQuery {
  dateFrom?: string;
  dateTo?: string;
  municipalityCode?: string;
  category?: RecordCategory;
}

export interface DashboardSummary {
  totalRecords: number;
  verifiedPercentage: number;
  coveredMunicipalities: number;
  totalsByCategory: Record<RecordCategory, number>;
}
