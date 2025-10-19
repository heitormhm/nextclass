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

const COLORS = [
  '#3b82f6', // Azul vibrante
  '#8b5cf6', // Roxo
  '#f59e0b', // Âmbar
  '#10b981', // Verde
  '#ef4444', // Vermelho
  '#06b6d4', // Ciano
  '#ec4899', // Rosa
  '#14b8a6', // Teal
  '#f97316', // Laranja
  '#6366f1', // Índigo
  '#84cc16', // Lima
  '#a855f7'  // Púrpura
];

export const InteractiveChart = ({ title, description, tipo_grafico, dados }: InteractiveChartProps) => {
  // Normalizar dados para formato esperado
  const normalizedData = dados.map((item: any) => {
    // Se já está no formato correto, retornar
    if ('categoria' in item && 'valor' in item) {
      return item;
    }
    
    // Tentar extrair de outros formatos comuns
    const categoria = item.categoria || item.x || item.nome || item.label || item.name || 'N/A';
    const valor = item.valor || item.y || item.quantidade || item.value || item.porcentagem || 0;
    
    return { categoria: String(categoria), valor: Number(valor) };
  });

  const getChartHeight = () => {
    if (tipo_grafico === 'pizza') return 380;
    if (tipo_grafico === 'barras' && normalizedData.length > 10) return 450;
    return 320;
  };

  const renderChart = () => {
    switch (tipo_grafico) {
      case 'barras':
        return (
          <BarChart data={normalizedData}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9}/>
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7}/>
              </linearGradient>
            </defs>
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
            <Bar dataKey="valor" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
          </BarChart>
        );
      
      case 'pizza':
        return (
          <PieChart>
            <Pie 
              data={normalizedData}
              dataKey="valor" 
              nameKey="categoria" 
              cx="50%" 
              cy="50%" 
              outerRadius={120}
              label={(entry) => `${entry.categoria}: ${entry.valor}`}
            >
              {normalizedData.map((_, index) => (
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
          <LineChart data={normalizedData}>
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
            <Line type="monotone" dataKey="valor" stroke={COLORS[0]} strokeWidth={3} />
          </LineChart>
        );
      
      default:
        return <p className="text-muted-foreground">Tipo de gráfico não suportado: {tipo_grafico}</p>;
    }
  };

  return (
    <div className="bg-gradient-to-br from-muted/30 to-muted/50 p-6 rounded-xl border-2 border-border my-6 shadow-sm max-w-4xl mx-auto">
      <h4 className="font-bold text-foreground mb-2 text-lg">📈 {title}</h4>
      <p className="text-sm text-muted-foreground italic mb-4">{description}</p>
      <p className="text-xs font-semibold text-foreground/80 mb-3">
        Tipo: <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">{tipo_grafico}</span>
      </p>
      <ResponsiveContainer width="100%" height={getChartHeight()}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};
