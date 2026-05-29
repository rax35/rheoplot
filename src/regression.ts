import type { DataPoint, HerschelBulkleyFitParams } from "./common";
import { fminsearch } from "./fminsearch"

const rheoModel = function(x: number[], [tau0, K, n]: number[]) {
  const safeK = Math.max(K, 1e-6);

  const safeN = Math.max(n, 1e-6);
  return x.map(
    function(xi) {
      return (tau0 + safeK * Math.pow(xi, safeN))
    }
  )
}

export function fminsearchFit(points: DataPoint[]): HerschelBulkleyFitParams | undefined {
  const filtered = points.filter(
    (p) => p.shearRate > 0 && Number.isFinite(p.shearStress),
  );

  if (filtered.length < 3) {
    return;
  }

  const x = filtered.map((p) => p.shearRate);

  const y = filtered.map((p) => p.shearStress);
  const [tau0, K, n] = fminsearch(rheoModel, [1, 1, 1], x, y, {
    maxIter: 100000
  })

  return { tau0, K, n }
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

  for (let i = 0; i < 1000; i++) {
    const gamma = min + ((max - min) * i) / 999;

    const tau = params.tau0 + params.K * Math.pow(gamma, params.n);

    fitted.push([gamma, tau]);
  }

  return fitted;
}
