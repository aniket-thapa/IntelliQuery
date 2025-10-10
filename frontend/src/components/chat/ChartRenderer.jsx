import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

export default function ChartRenderer({ visualization }) {
  if (
    !visualization ||
    !visualization.data ||
    !visualization.data.labels ||
    !visualization.data.datasets
  ) {
    return null;
  }

  const { type, title, data } = visualization;
  const { labels, datasets } = data;
  const dataset = datasets[0]; // Assuming one dataset for now

  // Format data for recharts
  const chartData = labels.map((label, index) => ({
    name: label,
    [dataset.label]: dataset.data[index],
  }));

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
              }}
            />
            <Legend />
            <Bar
              dataKey={dataset.label}
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={dataset.label}
              stroke="hsl(var(--primary))"
              activeDot={{ r: 8 }}
            />
          </LineChart>
        );
      default:
        return <p>Unsupported chart type: {type}</p>;
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-lg bg-muted/50">
      <h4 className="text-sm font-semibold mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={300}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
