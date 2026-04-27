import type { Region, RegionDailyStatistic, RegionPerformanceSummary } from '../types';
import type { HttpClient } from './http';

type RegionListParams = {
  status?: string;
  difficultyLevel?: string;
  regionCode?: string;
};

type RegionDailyStatisticListParams = {
  regionId?: string;
  serviceDate?: string;
};

type RegionPerformanceSummaryListParams = {
  regionId?: string;
  periodStart?: string;
  periodEnd?: string;
};

function toQueryString(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function listRegions(client: HttpClient, params: RegionListParams = {}) {
  return client.request<Region[]>(
    `/regions/${toQueryString({
      status: params.status,
      difficulty_level: params.difficultyLevel,
      region_code: params.regionCode,
    })}`,
  );
}

export async function getRegionByCode(client: HttpClient, regionCode: string) {
  const regions = await listRegions(client, { regionCode });
  const region = regions.find((candidate) => candidate.region_code === regionCode);
  if (!region) {
    throw new Error('권역을 찾을 수 없습니다.');
  }
  return region;
}

export function createRegion(
  client: HttpClient,
  payload: Pick<Region, 'region_code' | 'name' | 'status' | 'difficulty_level' | 'polygon_geojson' | 'description' | 'display_order'>,
) {
  return client.request<Region>('/regions/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateRegion(
  client: HttpClient,
  regionId: string,
  payload: Partial<Pick<Region, 'region_code' | 'name' | 'status' | 'difficulty_level' | 'polygon_geojson' | 'description' | 'display_order'>>,
) {
  return client.request<Region>(`/regions/${regionId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function listRegionDailyStatistics(client: HttpClient, params: RegionDailyStatisticListParams = {}) {
  return client.request<RegionDailyStatistic[]>(
    `/region-analytics/daily-statistics/${toQueryString({
      region_id: params.regionId,
      service_date: params.serviceDate,
    })}`,
  );
}

export function listRegionPerformanceSummaries(client: HttpClient, params: RegionPerformanceSummaryListParams = {}) {
  return client.request<RegionPerformanceSummary[]>(
    `/region-analytics/performance-summaries/${toQueryString({
      region_id: params.regionId,
      period_start: params.periodStart,
      period_end: params.periodEnd,
    })}`,
  );
}
