import React, { useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Material, MaterialCategory } from '../../types/database';
import { useTheme } from '../../hooks/useTheme';

interface CategoryPieChartProps {
  materials: Material[];
  categories: MaterialCategory[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ materials, categories }) => {
  const { isDark } = useTheme();
  const data = useMemo(() => {
    const categoryCount = new Map<string, number>();
    
    // 初始化计数
    categories.forEach(c => categoryCount.set(c.id, 0));
    
    // 统计每个分类的物料数量
    materials.forEach(m => {
      if (m.category_id && categoryCount.has(m.category_id)) {
        categoryCount.set(m.category_id, categoryCount.get(m.category_id)! + 1);
      }
    });

    // 转换为图表数据
    return categories
      .map(c => ({
        name: c.name,
        value: categoryCount.get(c.id) || 0
      }))
      .filter(item => item.value > 0); // 只显示有数据的分类
  }, [materials, categories]);

  return (
    <div className="h-80 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">物料分类分布</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderColor: isDark ? '#374151' : '#E5E7EB',
              color: isDark ? '#F9FAFB' : '#111827',
            }}
            itemStyle={{ color: isDark ? '#F9FAFB' : '#111827' }}
            labelStyle={{ color: isDark ? '#F9FAFB' : '#111827' }}
          />
          <Legend wrapperStyle={{ color: isDark ? '#D1D5DB' : '#374151' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryPieChart;
