import { fminsearchFit, generateHBModelCurve } from "./regression";
import { SHEAR_RATE_FACTOR, SHEAR_STRESS_FACTOR, type FluidData, type GraphData } from "./common";


function exportGraphData(fluids: FluidData[], rpms: number[]): GraphData {
  const result = fluids.map((fluid) => {
    const fluidName = fluid.name;

    const experimentalPoints = rpms
      .filter((rpm) => fluid.dialReadings[rpm] != null)
      .map((rpm) => {
        const dial = fluid.dialReadings[rpm];

        return {
          shearRate: +(rpm * SHEAR_RATE_FACTOR).toFixed(8),

          shearStress: +(dial * SHEAR_STRESS_FACTOR).toFixed(8),
        };
      });

    let fittedPoints;
    const fitParams = fminsearchFit(experimentalPoints);
    if (fitParams) {
      fittedPoints = generateHBModelCurve(experimentalPoints, fitParams);
    }

    const data = {
      fluidName,
      fluidId: fluid.id,
      experimentalPoints,
      ...(fittedPoints !== undefined && { fittedPoints }),
      ...(fitParams !== undefined && { fitParams }),
    };

    console.log(data)
    return data
  });

  return result;
};


self.onmessage = (e) => {
  const { requestId, fluids, rpms } = e.data

  const result = exportGraphData(fluids, rpms)

  self.postMessage({
    requestId, result
  })
}
