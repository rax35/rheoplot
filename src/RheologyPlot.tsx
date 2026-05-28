import Plot from "react-plotly.js";
import type { Data, Layout } from "plotly.js";
import type { GraphData } from "./common";

interface PlotProps {
  graphData: GraphData | null;
}

export default function RheologyPlot({ graphData }: PlotProps) {
  if (!graphData) return <p>No graph data</p>;

  console.log(graphData);
  console.log(Array.isArray(graphData));
  const traces: Data[] = graphData.map((fluid) => ({
    x: fluid.points.map((p) => p.shearRate),
    y: fluid.points.map((p) => p.shearStress),
    type: "scatter",
    mode: "lines+markers",
    name: fluid.fluidName,
  }));

  const layout: Partial<Layout> = {
    title: { text: "Rheogram" },

    xaxis: {
      title: { text: "Shear Rate" },
    },

    yaxis: {
      title: { text: "Shear Stress" },
    },

    autosize: true,

    height: 500,
  };

  return (
    <>
      <Plot data={traces} layout={layout} />
    </>
  );
}
