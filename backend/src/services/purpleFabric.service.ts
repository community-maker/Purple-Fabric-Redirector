import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';
import { AgentPublic } from '../interfaces/agent.interface';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

interface PurpleFabricTokenCache {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

interface PurpleFabricAccessTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

const LIST_AGENTS_QUERY = `query{
  assets(downloadImages:true,assetInput:{filterLevel:{Organization:[private, public, subscribed]}, sortFilters: {
    modified_date: DESC
  }, commonfilters: {created_by: [], status: []}, assetFlags: {getAssetFeature: true, getDeprecatedAssetsCount: true, getLatestAssetVersion:false}, assetFilters: {
    agent_type: []
    categories: [GENAI,WORKFLOW],
    sub_categories: [AUTOMATION,CONVERSATION,NEW]
  },searchFilter: "", getCurrentUserAssets: false}, paginate:  {
    page: 1,
    limit: 50,
  } ){
    items{
      images
      documents{
        base64
        file_id
      }
      name
      display_name
      category
      sub_category
      asset_id
      asset_version_id
      description
      version
      status
      is_public
      modified_date
      agent_type
      is_file_mandatory
    }
  }
}`;

function resolveField(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number') return String(value);
  }
  return null;
}

function resolveBoolean(source: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
  }
  return null;
}

function createImageDataUrl(base64: string | null): string | null {
  return base64 ? `data:image/webp;base64,${base64}` : null;
}

function parseAssetVersion(version: string | null): number {
  if (!version) return 0;
  const parsed = Number.parseFloat(version);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildAgentChatUrl(assetVersionId: string): string {
  return `${env.purpleFabric.webBaseUrl}/purplefabric/genai/ws/${env.purpleFabric.workspaceId}/chat/asset/${assetVersionId}/`;
}

export class PurpleFabricService {
  private readonly http: AxiosInstance;
  private tokenCache: PurpleFabricTokenCache | null = null;
  private tokenPromise: Promise<string> | null = null;

  constructor() {
    this.http = axios.create({
      baseURL: env.purpleFabric.endpoint,
      timeout: env.purpleFabric.timeoutMs,
      validateStatus: () => true,
    });
  }

  private get platformBasePath(): string {
    return `/magicplatform/${env.purpleFabric.apiVersion}`;
  }

  private buildAuthHeaders(accessToken: string, refreshToken?: string): Record<string, string> {
    return {
      apikey: env.purpleFabric.apiKey,
      authorization: `Bearer ${accessToken}`,
      ...(refreshToken ? { refreshtoken: refreshToken } : {}),
      'x-platform-workspaceid': env.purpleFabric.workspaceId,
    };
  }

  private async fetchAccessToken(): Promise<PurpleFabricTokenCache> {
    const response = await this.http.get<PurpleFabricAccessTokenResponse>(
      `/accesstoken/${env.purpleFabric.tenant}`,
      {
        headers: {
          apikey: env.purpleFabric.apiKey,
          username: env.purpleFabric.username,
          password: env.purpleFabric.password,
        },
      }
    );

    if (response.status >= 400 || !response.data?.access_token) {
      logger.error('Purple Fabric access token request failed', {
        status: response.status,
        data: response.data,
      });
      throw AppError.badGateway('Unable to authenticate with Purple Fabric');
    }

    const ttlMs = (response.data.expires_in ?? 300) * 1000;
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: Date.now() + ttlMs - env.purpleFabric.tokenRefreshBufferMs,
    };
  }

  private async getAccessToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.accessToken;
    }

    if (!this.tokenPromise) {
      this.tokenPromise = this.fetchAccessToken()
        .then((cache) => {
          this.tokenCache = cache;
          return cache.accessToken;
        })
        .finally(() => {
          this.tokenPromise = null;
        });
    }

    return this.tokenPromise;
  }

  async listWorkspaceAgents(): Promise<AgentPublic[]> {
    const accessToken = await this.getAccessToken();
    const response = await this.http.post(
      `${this.platformBasePath}/assets`,
      { query: LIST_AGENTS_QUERY },
      {
        headers: {
          ...this.buildAuthHeaders(accessToken, this.tokenCache?.refreshToken),
          'content-type': 'application/json',
        },
      }
    );

    if (response.status >= 400) {
      logger.error('Purple Fabric assets request failed', { status: response.status, data: response.data });
      throw AppError.badGateway('Unable to list Purple Fabric workspace agents');
    }

    const data = (response.data ?? {}) as Record<string, unknown>;
    const assets = data.data as Record<string, unknown> | undefined;
    const assetList = assets?.assets as Record<string, unknown> | undefined;
    const items = Array.isArray(assetList?.items) ? assetList.items : [];

    return items
      .map((item) => {
        const asset = item as Record<string, unknown>;
        const assetVersionId = resolveField(asset, ['asset_version_id']);
        const assetId = resolveField(asset, ['asset_id']);
        const name = resolveField(asset, ['display_name', 'name']);
        const status = resolveField(asset, ['status']);
        const documents = Array.isArray(asset.documents) ? asset.documents : [];
        const iconDocument = documents.find((document) => {
          const source = document as Record<string, unknown>;
          return typeof source.base64 === 'string' && source.base64.length > 0;
        }) as Record<string, unknown> | undefined;

        if (!assetVersionId || !assetId || !name) return null;

        return {
          id: assetVersionId,
          name,
          displayName: name,
          description: resolveField(asset, ['description']),
          category: resolveField(asset, ['category']),
          subCategory: resolveField(asset, ['sub_category']),
          status,
          version: resolveField(asset, ['version']),
          isPublic: resolveBoolean(asset, ['is_public', 'isPublic']) === true,
          assetId,
          assetVersionId,
          iconDataUrl: createImageDataUrl(resolveField(iconDocument ?? {}, ['base64'])),
          chatUrl: buildAgentChatUrl(assetVersionId),
        };
      })
      .filter((agent): agent is AgentPublic => agent !== null && agent.status === 'PUBLISHED')
      .sort((first, second) => {
        const nameCompare = first.name.localeCompare(second.name);
        if (nameCompare !== 0) return nameCompare;
        return parseAssetVersion(second.version) - parseAssetVersion(first.version);
      });
  }
}

export const purpleFabricService = new PurpleFabricService();
