import { useEffect, useMemo, useState } from "react";
import "./App.css";
//import RheologyPlot from "./RheologyPlot";
import RheologyTable from "./RheologyTable";
import {
  initialRpms,
  SHEAR_RATE_FACTOR,
  SHEAR_STRESS_FACTOR,
  STORAGE_KEY,
  type FluidData,
  type SaveData,
  type GraphData,
} from "./common";
import RheologyPlot from "./RheologyPlot";
import { fitHerschelBulkley, generateHBModelCurve } from "./regression";

const loadSavedData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return null;
    }

    return JSON.parse(saved) as SaveData;
  } catch (err) {
    console.error(err);
    return null;
  }
};

function createFluid(name: string): FluidData {
  return {
    id: crypto.randomUUID(),
    name,
    dialReadings: {},
  };
}

const exportGraphData = (fluids: FluidData[], rpms: number[]): GraphData => {
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
    const fitParams = fitHerschelBulkley(experimentalPoints);
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

function App() {
  const savedData = loadSavedData();

  const [rpms, setRpms] = useState(savedData?.rpms ?? initialRpms);

  const [fluids, setFluids] = useState(
    () => savedData?.fluids ?? [createFluid("Water")],
  );

  const addFluid = () => {
    setFluids((prevFluids) => [
      ...prevFluids,
      createFluid(`Fluid ${prevFluids.length + 1}`),
    ]);
  };

  const removeFluid = (fluidID: ReturnType<Crypto["randomUUID"]>) => {
    setFluids((prev) => prev.filter((fluid) => fluid.id !== fluidID));
  };

  const addRpm = () => {
    const value = prompt("Enter RPM");

    if (!value) return;

    const rpm = Number(value);

    if (Number.isNaN(rpm)) {
      alert("Invalid RPM");
      return;
    }

    setRpms((prevRpms) => [...prevRpms, rpm].sort((a, b) => a - b));
  };

  const removeRpm = (rpmToRemove: number) => {
    // Remove RPM row
    setRpms((prev) => prev.filter((rpm) => rpm !== rpmToRemove));

    // Remove readings tied to that RPM
    setFluids((prevFluids) =>
      prevFluids.map((fluid) => {
        const updatedReadings = {
          ...fluid.dialReadings,
        };

        delete updatedReadings[rpmToRemove];

        return {
          ...fluid,
          dialReadings: updatedReadings,
        };
      }),
    );
  };

  const updateFluidName = (index: number, value: string) => {
    setFluids((prevFluids) => {
      const copy = [...prevFluids];

      copy[index] = {
        ...copy[index],
        name: value,
      };

      return copy;
    });
  };

  const resetTable = () => {
    localStorage.removeItem(STORAGE_KEY);

    setRpms(initialRpms);

    setFluids([createFluid("Water")]);
  };

  useEffect(() => {
    const payload = {
      rpms,
      fluids,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [rpms, fluids]);

  const graphData = useMemo(
    () => exportGraphData(fluids, rpms),
    [rpms, fluids],
  );

  return (
    <>
      <section id="center">
        <div>
          <h1>RheoPlot</h1>
        </div>
        {/* CONTROLS */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <button onClick={addFluid}>Add Fluid</button>

          <button onClick={addRpm}>Add RPM</button>

          {/*<button onClick={exportGraphData}>Export Graph Data</button>*/}

          <button onClick={resetTable}>Reset</button>
        </div>

        {/* FLUID NAME INPUTS */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {fluids.map((fluid, index) => (
            <div
              key={fluid.id}
              style={{
                border: "1px solid #ccc",
                padding: 10,
                borderRadius: 4,
              }}
            >
              <div style={{ marginBottom: 8 }}>{fluid.name}</div>

              <input
                name="fluid-name"
                value={fluid.name}
                onChange={(e) => updateFluidName(index, e.target.value)}
              />

              <button
                onClick={() => removeFluid(fluid.id)}
                style={{
                  marginLeft: 8,
                }}
              >
                Remove
              </button>
              <br />

              <table>
                <tr>
                  <th>PV (cP)</th>
                  <td>{fluid.dialReadings[600] - fluid.dialReadings[300]}</td>
                </tr>
                <tr>
                  <th>YP (lb/100ft²)</th>
                  <td>{(2 * fluid.dialReadings[300]) - fluid.dialReadings[600]}</td>
                </tr>
                <tr>
                  <th>Tau0</th>
                  <td>{graphData.find((data) => data.fluidId === fluid.id)?.fitParams?.tau0.toFixed(4)}</td>
                </tr>
                <tr>
                  <th>K</th>
                  <td>{graphData.find((data) => data.fluidId === fluid.id)?.fitParams?.K.toFixed(4)}</td>
                </tr>
                <tr>
                  <th>n</th>
                  <td>{graphData.find((data) => data.fluidId === fluid.id)?.fitParams?.n.toFixed(4)}</td>
                </tr>
              </table>
            </div>
          ))}
        </div>
        <RheologyTable
          rpms={rpms}
          fluids={fluids}
          setFluids={setFluids}
          removeRpm={removeRpm}
        />

        <section id="spacer"></section>

        <RheologyPlot graphData={graphData} />
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  );
}

export default App;
