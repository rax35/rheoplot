import HotTable from "@handsontable/react-wrapper";
import "./RheologyTable.css";
import { registerAllModules } from "handsontable/registry";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Events } from "handsontable";

registerAllModules();

const SHEAR_RATE_FACTOR = 1.023;
const SHEAR_STRESS_FACTOR = 1.065;

const STORAGE_KEY = "rheology-table";

const initialRpms = [3, 6, 100, 200, 300, 600];

interface fluidData {
  id: ReturnType<Crypto["randomUUID"]>;
  name: string;
  dialReadings: Record<number, number>;
}

function createFluid(name: string): fluidData {
  return {
    id: crypto.randomUUID(),
    name,
    dialReadings: {},
  };
}

interface saveData {
  rpms: [number];
  fluids: fluidData[];
}

const loadSavedData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return null;
    }

    return JSON.parse(saved) as saveData;
  } catch (err) {
    console.error(err);
    return null;
  }
};

export default function RheologyTable() {
  const hotRef = useRef(null);

  const savedData = loadSavedData();

  const [rpms, setRpms] = useState(savedData?.rpms ?? initialRpms);

  const [fluids, setFluids] = useState(
    () => savedData?.fluids ?? [createFluid("Water")],
  );

  const tableData = useMemo(() => {
    return rpms.map((rpm) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row: Record<any, number> = {
        rpm,
        shearRate: +(rpm * SHEAR_RATE_FACTOR).toFixed(2),
      };

      fluids.forEach((fluid) => {
        const dial = fluid.dialReadings[rpm] ?? 0;

        row[`fluid_${fluid.id}_dial`] = dial;

        row[`fluid_${fluid.id}_stress`] = +(dial * SHEAR_STRESS_FACTOR).toFixed(
          3,
        );
      });

      return row;
    });
  }, [rpms, fluids]);

  const columns = useMemo(() => {
    return [
      {
        data: "rpm",
        type: "numeric",
      },
      {
        data: "shearRate",
        type: "numeric",
        readOnly: true,
      },

      ...fluids.flatMap((fluid) => [
        {
          data: `fluid_${fluid.id}_dial`,
          type: "numeric",
        },
        {
          data: `fluid_${fluid.id}_stress`,
          type: "numeric",
          readOnly: true,
        },
      ]),
    ];
  }, [fluids]);

  const nestedHeaders = useMemo(() => {
    return [
      [
        "RPM",
        "Shear Rate",
        ...fluids.flatMap((fluid) => [
          {
            label: fluid.name,
            colspan: 2,
          },
        ]),
      ],

      [
        "",
        "(sec⁻¹)",

        ...fluids.flatMap(() => [
          "Dial Readings<br>°Fann",
          "Shear Stress<br>lb/100ft²",
        ]),
      ],
    ];
  }, [fluids]);

  const handleAfterChange: Events["afterChange"] = (changes, source) => {
    if (!changes || source == "loadData") {
      return;
    }

    setFluids((prevFluids) => {
      const updated = [...prevFluids];

      changes.forEach(([row, prop, , newValue]) => {
        if (!(prop as string).includes("_dial")) {
          return;
        }

        const fluidId = (prop as string).split("_")[1];
        const fluidIndex = updated.findIndex((f) => f.id === fluidId);
        if (fluidIndex === -1) return;

        const rpm = rpms[row];

        updated[fluidIndex] = {
          ...updated[fluidIndex],
          dialReadings: {
            ...updated[fluidIndex].dialReadings,
            [rpm]: Number(newValue),
          },
        };
      });

      return updated;
    });
  };

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

  const exportGraphData = () => {
    const result = fluids.map((fluid) => {
      return {
        fluidName: fluid.name,

        points: rpms.map((rpm) => {
          const dial = fluid.dialReadings[rpm] ?? 0;

          return {
            shearRate: +(rpm * SHEAR_RATE_FACTOR).toFixed(2),

            shearStress: +(dial * SHEAR_STRESS_FACTOR).toFixed(2),
          };
        }),
      };
    });

    console.log(result);

    alert("Graph data exported.\nCheck console.");
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

  return (
    <div id="dataSheet">
      <h2>Rheology Table</h2>

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

        <button onClick={exportGraphData}>Export Graph Data</button>

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
          </div>
        ))}
      </div>

      {/* TABLE */}
      <HotTable
        ref={hotRef}
        data={tableData}
        columns={columns}
        nestedHeaders={nestedHeaders}
        colHeaders={true}
        rowHeaders={true}
        width="auto"
        height="auto"
        stretchH="all"
        licenseKey="non-commercial-and-evaluation"
        afterChange={handleAfterChange}
        contextMenu={{
          items: {
            remove_rpm: {
              name: "Remove RPM Row",
              callback(_, selection) {
                const row = selection[0].start.row;
                const rpm = rpms[row];

                removeRpm(rpm);
              },
            },
          },
        }}
      />
    </div>
  );
}
