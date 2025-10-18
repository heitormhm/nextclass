import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface ChartData {
  categoria: string;
  valor: number;
}

interface InteractiveChartProps {
  title: string;
  description: string;
  tipo_grafico: 'barras' | 'pizza' | 'linha';
  dados: ChartData[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

export const InteractiveChart = ({ title, description, tipo_grafico, dados }: InteractiveChartProps) => {
  const renderChart = () => {
    switch (tipo_grafico) {
      case 'barras':
        return (
          <BarChart data={dados}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="categoria" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          </BarChart>
        );
      
      case 'pizza':
        return (
          <PieChart>
            <Pie 
              data={dados} 
              dataKey="valor" 
              nameKey="categoria" 
              cx="50%" 
              cy="50%" 
              outerRadius={100}
              label={(entry) => `${entry.categoria}: ${entry.valor}`}
            >
              {dados.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
          </PieChart>
        );
      
      case 'linha':
        return (
          <LineChart data={dados}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="categoria" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={3} />
          </LineChart>
        );
      
      default:
        return <p className="text-muted-foreground">Tipo de gráfico não suportado: {tipo_grafico}</p>;
    }
  };

  return (
    <div className="bg-gradient-to-br from-muted/30 to-muted/50 p-6 rounded-xl border-2 border-border my-6 shadow-sm">
      <h4 className="font-bold text-foreground mb-2 text-lg">📈 {title}</h4>
      <p className="text-sm text-muted-foreground italic mb-4">{description}</p>
      <p className="text-xs font-semibold text-foreground/80 mb-3">
        Tipo: <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">{tipo_grafico}</span>
      </p>
      <ResponsiveContainer width="100%" height={350}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};
