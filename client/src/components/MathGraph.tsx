import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface GraphDataPoint {
  [key: string]: number | string | undefined;
}

interface GraphSeries {
  name: string;
  data: (number | null)[];
}

interface GraphData {
  type: "line" | "bar" | "scatter" | "area";
  title: string;
  xAxis: {
    label: string;
    data: (string | number)[];
  };
  yAxis: {
    label: string;
  };
  series: GraphSeries[];
}

interface MathGraphProps {
  data: GraphData;
}

export default function MathGraph({ data }: MathGraphProps) {
  const chartData = useMemo(() => {
    // Transform data into recharts format
    const transformed: GraphDataPoint[] = [];

    if (data.xAxis.data.length === 0) {
      return [];
    }

    // Determine the maximum length
    const maxLength = Math.max(
      data.xAxis.data.length,
      ...data.series.map((s) => s.data.length)
    );

    for (let i = 0; i < maxLength; i++) {
      const point: GraphDataPoint = {
        x: data.xAxis.data[i] ?? i,
      };

      data.series.forEach((series) => {
        const value = series.data[i];
        if (value !== null && value !== undefined) {
          point[series.name] = value;
        }
      });

      transformed.push(point);
    }

    return transformed;
  }, [data]);

  const colors = [
    "#3b82f6", // blue
    "#ef4444", // red
    "#10b981", // green
    "#f59e0b", // amber
    "#8b5cf6", // purple
    "#ec4899", // pink
  ];

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 0, bottom: 5 },
    };

    switch (data.type) {
      case "line":
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" label={{ value: data.xAxis.label, position: "insideBottomRight", offset: -5 }} />
            <YAxis label={{ value: data.yAxis.label, angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            {data.series.map((series, idx) => (
              <Line
                key={series.name}
                type="monotone"
                dataKey={series.name}
                stroke={colors[idx % colors.length]}
                dot={false}
                isAnimationActive={true}
              />
            ))}
          </LineChart>
        );

      case "bar":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" label={{ value: data.xAxis.label, position: "insideBottomRight", offset: -5 }} />
            <YAxis label={{ value: data.yAxis.label, angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            {data.series.map((series, idx) => (
              <Bar
                key={series.name}
                dataKey={series.name}
                fill={colors[idx % colors.length]}
              />
            ))}
          </BarChart>
        );

      case "scatter":
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" label={{ value: data.xAxis.label, position: "insideBottomRight", offset: -5 }} />
            <YAxis label={{ value: data.yAxis.label, angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            {data.series.map((series, idx) => (
              <Scatter
                key={series.name}
                name={series.name}
                dataKey={series.name}
                fill={colors[idx % colors.length]}
              />
            ))}
          </ScatterChart>
        );

      case "area":
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" label={{ value: data.xAxis.label, position: "insideBottomRight", offset: -5 }} />
            <YAxis label={{ value: data.yAxis.label, angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            {data.series.map((series, idx) => (
              <Area
                key={series.name}
                type="monotone"
                dataKey={series.name}
                fill={colors[idx % colors.length]}
                stroke={colors[idx % colors.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        );

      default:
        return <div>Unsupported chart type: {data.type}</div>;
    }
  };

  if (chartData.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-gray-500">グラフデータが利用できません</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-4">
      {data.title && <h3 className="text-lg font-semibold mb-4">{data.title}</h3>}
      <ResponsiveContainer width="100%" height={400}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
