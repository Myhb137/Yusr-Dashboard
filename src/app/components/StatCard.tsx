import { motion } from 'motion/react';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
  gradientFrom: string;
  gradientTo: string;
  bgGradient: string;
  index: number;
}

export function StatCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  gradientFrom,
  gradientTo,
  bgGradient,
  index,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
      whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
      className="relative bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg overflow-hidden"
    >
      {/* Background Decoration */}
      <div
        className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${bgGradient} opacity-5 rounded-full`}
      ></div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          {/* Icon */}
          <div
            className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center shadow-lg`}
          >
            <Icon className="text-white text-2xl" />
          </div>

          {/* Change Indicator */}
          <div
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
              trend === 'up'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {trend === 'up' ? (
              <ArrowUpward className="text-base" />
            ) : (
              <ArrowDownward className="text-base" />
            )}
            <span>{change}</span>
          </div>
        </div>

        {/* Value */}
        <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
      </div>
    </motion.div>
  );
}
