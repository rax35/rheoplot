import { levenbergMarquardt } from "ml-levenberg-marquardt";
import type { DataPoint, HerschelBulkleyFitParams } from "./common";

export function fitHerschelBulkley(
  points: DataPoint[],
): HerschelBulkleyFitParams | undefined {
  const filtered = points.filter(
    (p) => p.shearRate > 0 && Number.isFinite(p.shearStress),
  );

  if (filtered.length < 3) {
    return;
  }

  const x = filtered.map((p) => p.shearRate);

  const y = filtered.map((p) => p.shearStress);

  const tau0Guess = Math.min(...y) * 0.5;

  const model = ([tau0, K, n]: number[]) => {
    const safeK = Math.max(K, 1e-6);

    const safeN = Math.max(n, 1e-6);

    return (gamma: number) => tau0 + safeK * Math.pow(gamma, safeN);
  };

  const options = {
    damping: 0.01,

    initialValues: [tau0Guess, 1, 1],

    gradientDifference: 1e-8,

    maxIterations: 1000,

    errorTolerance: 1e-10,
  };

  const fit = levenbergMarquardt({ x, y }, model, options);

  const [tau0, K, n] = fit.parameterValues;

  if (!Number.isFinite(tau0) || !Number.isFinite(K) || !Number.isFinite(n)) {
    return;
  }

  return {
    tau0,
    K,
    n,
  };
}

export function generateHBModelCurve(
  points: DataPoint[],
  params: {
    tau0: number;
    K: number;
    n: number;
  },
) {
  const rates = points.map((p) => p.shearRate);

  const min = Math.min(...rates);

  const max = Math.max(...rates);

  const fitted = [];

  for (let i = 0; i < 100; i++) {
    const gamma = min + ((max - min) * i) / 99;

    const tau = params.tau0 + params.K * Math.pow(gamma, params.n);

    fitted.push([gamma, tau]);
  }

  return fitted;
}
