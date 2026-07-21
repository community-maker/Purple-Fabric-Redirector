export interface AgentPublic {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  category: string | null;
  subCategory: string | null;
  status: string | null;
  version: string | null;
  isPublic: boolean;
  assetId: string;
  assetVersionId: string;
  iconDataUrl: string | null;
  chatUrl: string;
}
