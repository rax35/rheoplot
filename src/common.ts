export const SHEAR_RATE_FACTOR = 1.023;
export const SHEAR_STRESS_FACTOR = 1.065;

export const STORAGE_KEY = "rheology-table";

export const initialRpms = [3, 6, 100, 200, 300, 600];

export interface FluidData {
  id: ReturnType<Crypto["randomUUID"]>;
  name: string;
  dialReadings: Record<number, number>;
}

export interface SaveData {
  rpms: [number];
  fluids: FluidData[];
}

export type GraphData = {
  fluidName: string;
  points: {
    shearRate: number;
    shearStress: number;
  }[];
}[];
