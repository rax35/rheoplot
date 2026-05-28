import type { EChartsOption } from "echarts";
import type { GraphData } from "./common";
import EChartsReact from "echarts-for-react";
import type { SeriesOption } from "echarts";

interface PlotProps {
  graphData: GraphData | null;
}

export default function RheologyPlot({ graphData }: PlotProps) {
  if (!graphData || graphData.length === 0) return <p>No graph data</p>;

  const series: SeriesOption[] = graphData.map((fluid) => ({
    name: fluid.fluidName,
    type: "scatter",
    smooth: false,
    symbolSize: 8,
    data: fluid.experimentalPoints.map((point) => [
      point.shearRate,
      point.shearStress,
    ]),
  }));

  graphData.forEach((fluid) => {
    if (!fluid.fittedPoints) return;
    series.push({
      name: fluid.fluidName + " HB Fit",

      type: "line",

      smooth: true,

      symbol: "none",

      data: fluid.fittedPoints,
    });
  });

  const options: EChartsOption = {
    title: {
      text: "Rheogram",
    },

    tooltip: {
      trigger: "axis",
    },

    legend: {
      orient: "vertical",
      right: 10,
      top: "center",
    },

    toolbox: {
      feature: {
        saveAsImage: {},
        dataZoom: {},
        restore: {},
      },
    },

    xAxis: {
      type: "value",

      name: "Shear Rate (sec⁻¹)",

      nameLocation: "middle",

      nameGap: 30,
    },

    yAxis: {
      type: "value",

      name: "Shear Stress lb/100ft²",

      nameLocation: "middle",

      nameGap: 50,
    },

    dataZoom: [
      {
        type: "inside",
      },
    ],

    series,
  };

  return (
    <div
      className="chart-container"
      style={{
        width: "100%",
        height: "500px",
      }}
    >
      <EChartsReact
        option={options}
        theme={"dark"}
        notMerge={true}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
