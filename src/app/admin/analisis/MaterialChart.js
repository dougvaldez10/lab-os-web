"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function MaterialChart({ data, emptyMessage = "Sin datos en el periodo", showLegend = true, valueType = "units" }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-slate-400 font-medium text-sm">
        {emptyMessage}
      </div>
    );
  }

  const heightClass = showLegend ? "h-[300px]" : "h-[220px]";

  const formatTooltipValue = (value) => {
    if (valueType === "currency") {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
    }
    return `${value} unidades`;
  };

  const tooltipLabel = valueType === "currency" ? "Ingresos" : "Cantidad";

  return (
    <div className={`${heightClass} w-full mt-2`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius="70%"
            outerRadius="85%"
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [formatTooltipValue(value), tooltipLabel]}
            contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          {showLegend && (
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span className="text-xs font-semibold text-slate-600">{value}</span>}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
