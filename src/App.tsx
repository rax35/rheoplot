import { useEffect, useRef, useState } from "react";
import "./App.css";
//import RheologyPlot from "./RheologyPlot";
import RheologyTable from "./RheologyTable";
import {
  initialRpms,
  STORAGE_KEY,
  type FluidData,
  type GraphData,
  type SaveData,
} from "./common";
import RheologyPlot from "./RheologyPlot";

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

  const workerRef = useRef<Worker | null>(null)
  const requestIdRef = useRef(0)

  const [graphData, setGraphData] = useState<GraphData | null>(null)
  useEffect(() => {
    workerRef.current ??= new Worker(
      new URL("./worker.ts", import.meta.url), { type: "module" }
    )

    const currentRequestId = ++requestIdRef.current

    workerRef.current.postMessage({ requestId: currentRequestId, fluids, rpms })

    workerRef.current.onmessage = (e: MessageEvent<{
      requestId: number,
      result: GraphData
    }>) => {
      const { requestId, result } = e.data

      if (requestId !== requestIdRef.current) {
        return
      }

      setGraphData(result)
    }
  },
    [rpms, fluids],
  );

  return (
    <>
      <section id="center">
        <div>
          <h1>RheoPlot</h1>v1.0
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
                  <th>Tau0 (τ₀)</th>
                  <td>{graphData?.find((data) => data.fluidId === fluid.id)?.fitParams?.tau0.toFixed(4)}</td>
                </tr>
                <tr>
                  <th>K</th>
                  <td>{graphData?.find((data) => data.fluidId === fluid.id)?.fitParams?.K.toFixed(4)}</td>
                </tr>
                <tr>
                  <th>n</th>
                  <td>{graphData?.find((data) => data.fluidId === fluid.id)?.fitParams?.n.toFixed(4)}</td>
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
