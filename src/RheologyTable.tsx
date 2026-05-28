import HotTable from "@handsontable/react-wrapper";
import "./RheologyTable.css";
import { registerAllModules } from "handsontable/registry";
import React, { useMemo, useRef } from "react";
import type { Events } from "handsontable";
import {
  SHEAR_RATE_FACTOR,
  SHEAR_STRESS_FACTOR,
  type FluidData,
} from "./common";

registerAllModules();

interface TableProps {
  rpms: number[];
  fluids: FluidData[];
  setFluids: React.Dispatch<React.SetStateAction<FluidData[]>>;
  removeRpm: (rpmToRemove: number) => void;
}
export default function RheologyTable({
  rpms,
  fluids,
  setFluids,
  removeRpm,
}: TableProps) {
  const hotRef = useRef(null);

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

  return (
    <div id="dataSheet">
      <h2>Rheology Table</h2>

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
