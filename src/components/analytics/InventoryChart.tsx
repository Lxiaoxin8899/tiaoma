import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Material } from '../../types/database';

interface InventoryChartProps {
  materials: Material[];
}

const InventoryChart: React.FC<InventoryChartProps> = ({ materials }) => {
  const data = useMemo(() => {
    // 按库存数量排序，取前10个
    return materials
      .sort((a, b) => b.current_stock - a.current_stock)
      .slice(0, 10)
      .map(m => ({
        name: m.name,
        库存: m.current_stock,
        预警值: m.min_stock
      }));
  }, [materials]);

  return (
    <div className="h-80 w-full bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">库存数量排行 (Top 10)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="库存" fill="#3B82F6" />
          <Bar dataKey="预警值" fill="#EF4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InventoryChart;
