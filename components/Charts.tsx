
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { KPIStats } from '../types.ts';

interface ChartsProps {
  stats: KPIStats;
  onStatClick?: (filter: 'all' | 'repair' | 'optimal') => void;
}

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color?: string }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950 border border-slate-700 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">{label || payload[0].name}</p>
        <p className="text-white text-xl font-black">{payload[0].value} <span className="text-xs font-bold text-slate-600 uppercase">UNIDADES</span></p>
      </div>
    );
  }
  return null;
};

interface CustomizedLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  name: string;
  percent: number;
}

const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, name, percent }: CustomizedLabelProps) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 15;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Dividir el nombre en dos líneas si es muy largo
  const words = name.split(' ');
  let line1 = name;
  let line2 = '';

  if (words.length > 2) {
    line1 = words.slice(0, 2).join(' ');
    line2 = words.slice(2).join(' ');
  }

  return (
    <g>
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-[9px] font-black uppercase tracking-tighter"
      >
        <tspan x={x} dy="-0.6em">{line1}</tspan>
        {line2 && <tspan x={x} dy="1em">{line2}</tspan>}
        <tspan x={x} dy="1.2em" fill="#6366f1" className="text-[12px]">{(percent * 100).toFixed(0)}%</tspan>
      </text>
    </g>
  );
};

const Charts: React.FC<ChartsProps> = ({ stats, onStatClick }) => {
  const estadoData = [
    { name: 'BUENO', count: stats.estados.find(e => e.name === 'BUENO')?.count || 0, color: '#10b981' },
    { name: 'REGULAR', count: stats.estados.find(e => e.name === 'REGULAR')?.count || 0, color: '#f59e0b' },
    { name: 'MALO', count: stats.estados.find(e => e.name === 'MALO')?.count || 0, color: '#f43f5e' }
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <div className="bg-slate-900/40 border border-slate-800/60 p-8 rounded-[2.5rem] shadow-2xl">
        <h3 className="text-xl font-black text-white mb-10 flex items-center gap-3 tracking-tight uppercase italic">
          <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />Familias e Instrumentos
        </h3>
        <div className="h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <Pie
                data={stats.categorias}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={stats.categorias.length > 1 ? 4 : 0}
                dataKey="value"
                stroke="transparent"
                label={renderCustomizedLabel}
                labelLine={{ stroke: '#64748b', strokeWidth: 1.5 }}
                startAngle={90}
                endAngle={450}
              >
                {stats.categorias.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{
                  paddingTop: '30px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-slate-900/40 border border-slate-800/60 p-8 rounded-[2.5rem] shadow-2xl">
        <h3 className="text-xl font-black text-white mb-10 flex items-center gap-3 tracking-tight uppercase italic">
          <div className="w-1.5 h-6 bg-rose-500 rounded-full" />Estado del Inventario
        </h3>
        <div className="h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={estadoData}
              layout="vertical"
              margin={{ left: 20, right: 60, top: 40, bottom: 40 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 900 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" radius={[0, 12, 12, 0]} barSize={50}>
                {estadoData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Charts;
