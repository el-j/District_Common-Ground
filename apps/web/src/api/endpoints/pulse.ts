import type { DistrictPulseState } from '@district-cg/shared-types';
import { request } from '../client';

export async function fetchPulseEconomy(): Promise<DistrictPulseState | null> {
  try {
    return await request<DistrictPulseState>('GET', '/api/v1/pulse/economy');
  } catch {
    return null;
  }
}

export async function fetchPulseClimate(): Promise<Pick<DistrictPulseState, 'multipliers'> | null> {
  try {
    return await request<Pick<DistrictPulseState, 'multipliers'>>('GET', '/api/v1/pulse/climate');
  } catch {
    return null;
  }
}
