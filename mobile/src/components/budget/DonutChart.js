import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors } from '../../theme';

// Safely require react-native-svg for native iOS / Android only
let NativeSvg = null;
let NativeG = null;
let NativePath = null;
let NativeCircle = null;

if (Platform.OS !== 'web') {
  try {
    const RNSvg = require('react-native-svg');
    NativeSvg = RNSvg.Svg || RNSvg.default;
    NativeG = RNSvg.G;
    NativePath = RNSvg.Path;
    NativeCircle = RNSvg.Circle;
  } catch (err) {
    console.warn('react-native-svg is not installed or linked on native:', err);
  }
}

const CATEGORY_PALETTE = [
  '#00A3FF', // Cyan / Blue (Transport / Keells)
  '#FF9F1C', // Amber / Orange (Food)
  '#E91E63', // Magenta / Pink (Shopping)
  '#FF3B30', // Red (Bills)
  '#10B981', // Emerald (Groceries)
  '#8B5CF6', // Purple (Dairy)
  '#F59E0B', // Gold (Produce)
];

/**
 * Builds standard SVG donut annular arc path string
 * Uses toFixed(2) to prevent scientific notation and NaN errors
 */
function describeDonutSlice(cx, cy, rInner, rOuter, startAngle, endAngle) {
  const toRad = (deg) => ((deg - 90) * Math.PI) / 180;
  const arcLength = Math.max(0.1, endAngle - startAngle);

  if (arcLength >= 359.99) {
    const midAngle = startAngle + 180;
    const a1 = toRad(startAngle);
    const a2 = toRad(midAngle);
    const a3 = toRad(endAngle);

    return (
      `M ${(cx + rOuter * Math.cos(a1)).toFixed(2)} ${(cy + rOuter * Math.sin(a1)).toFixed(2)} ` +
      `A ${rOuter.toFixed(2)} ${rOuter.toFixed(2)} 0 0 1 ${(cx + rOuter * Math.cos(a2)).toFixed(2)} ${(cy + rOuter * Math.sin(a2)).toFixed(2)} ` +
      `A ${rOuter.toFixed(2)} ${rOuter.toFixed(2)} 0 0 1 ${(cx + rOuter * Math.cos(a3)).toFixed(2)} ${(cy + rOuter * Math.sin(a3)).toFixed(2)} ` +
      `L ${(cx + rInner * Math.cos(a3)).toFixed(2)} ${(cy + rInner * Math.sin(a3)).toFixed(2)} ` +
      `A ${rInner.toFixed(2)} ${rInner.toFixed(2)} 0 0 0 ${(cx + rInner * Math.cos(a2)).toFixed(2)} ${(cy + rInner * Math.sin(a2)).toFixed(2)} ` +
      `A ${rInner.toFixed(2)} ${rInner.toFixed(2)} 0 0 0 ${(cx + rInner * Math.cos(a1)).toFixed(2)} ${(cy + rInner * Math.sin(a1)).toFixed(2)} Z`
    );
  }

  const a1 = toRad(startAngle);
  const a2 = toRad(endAngle);

  const x1 = cx + rOuter * Math.cos(a1);
  const y1 = cy + rOuter * Math.sin(a1);
  const x2 = cx + rOuter * Math.cos(a2);
  const y2 = cy + rOuter * Math.sin(a2);

  const x3 = cx + rInner * Math.cos(a2);
  const y3 = cy + rInner * Math.sin(a2);
  const x4 = cx + rInner * Math.cos(a1);
  const y4 = cy + rInner * Math.sin(a1);

  if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
    return '';
  }

  const largeArcFlag = arcLength > 180 ? 1 : 0;

  return (
    `M ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
    `A ${rOuter.toFixed(2)} ${rOuter.toFixed(2)} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} ` +
    `L ${x3.toFixed(2)} ${y3.toFixed(2)} ` +
    `A ${rInner.toFixed(2)} ${rInner.toFixed(2)} 0 ${largeArcFlag} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`
  );
}

export default function DonutChart({
  categories = [],
  size = 180,
  innerRadius = 48,
  outerRadius = 78,
  showLegend = true,
  selectedCategory = null,
  onSelectCategory,
}) {
  const [internalSelectedIdx, setInternalSelectedIdx] = useState(null);

  const cx = size / 2;
  const cy = size / 2;

  // Filter categories with positive percentage/amount
  const validCategories = (Array.isArray(categories) ? categories : []).filter(
    (c) => (c?.percentage || c?.amount || 0) > 0
  );

  const selectedIdx = selectedCategory
    ? validCategories.findIndex((c) => c.name === selectedCategory.name)
    : internalSelectedIdx;

  const totalAmount = validCategories.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalPercentage = validCategories.reduce((sum, c) => sum + (c.percentage || 0), 0) || 100;

  // Compute angles
  let currentAngle = 0;
  const padAngle = validCategories.length > 1 ? 2.5 : 0;

  const slices = validCategories.map((cat, idx) => {
    const rawSweep = ((cat.percentage || (cat.amount / (totalAmount || 1)) * 100) / totalPercentage) * 360;
    const sweep = Math.max(0.5, rawSweep);
    const startAngle = currentAngle + (padAngle / 2);
    const endAngle = currentAngle + sweep - (padAngle / 2);
    currentAngle += sweep;

    const isSelected = selectedIdx === idx;
    const rOut = isSelected ? outerRadius + 3 : outerRadius;
    const rIn = isSelected ? innerRadius - 2 : innerRadius;

    const pathData = describeDonutSlice(cx, cy, rIn, rOut, startAngle, endAngle);

    return {
      name: cat.name || `Cat-${idx}`,
      amount: cat.amount || 0,
      percentage: cat.percentage || Math.round(rawSweep / 3.6),
      index: idx,
      startAngle,
      endAngle,
      path: pathData,
      color: cat.color || CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length],
      isSelected,
    };
  });

  const activeCategory = selectedIdx !== null && selectedIdx >= 0 ? validCategories[selectedIdx] : null;

  const handleSelect = (idx) => {
    const nextIdx = selectedIdx === idx ? null : idx;
    setInternalSelectedIdx(nextIdx);
    if (onSelectCategory) {
      onSelectCategory(nextIdx !== null ? validCategories[nextIdx] : null);
    }
  };

  // Render SVG element: Uses standard HTML5 <svg> on Web, and Native Svg on iOS/Android
  const renderSvgChart = () => {
    if (Platform.OS === 'web') {
      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ display: 'block', overflow: 'visible' }}
        >
          <g>
            {slices.length === 0 ? (
              <circle
                cx={cx}
                cy={cy}
                r={(innerRadius + outerRadius) / 2}
                stroke="#E5E7EB"
                strokeWidth={outerRadius - innerRadius}
                fill="none"
              />
            ) : (
              slices.map((slice) => {
                if (!slice.path) return null;
                return (
                  <path
                    key={`slice-${slice.index}`}
                    d={slice.path}
                    fill={slice.color}
                    fillOpacity={selectedIdx === null || slice.isSelected ? 1 : 0.4}
                  />
                );
              })
            )}
          </g>
        </svg>
      );
    }

    // Native iOS/Android with react-native-svg
    if (NativeSvg && NativePath) {
      return (
        <NativeSvg width={size} height={size}>
          <NativeG>
            {slices.length === 0 ? (
              NativeCircle ? (
                <NativeCircle
                  cx={cx}
                  cy={cy}
                  r={(innerRadius + outerRadius) / 2}
                  stroke="#E5E7EB"
                  strokeWidth={outerRadius - innerRadius}
                  fill="none"
                />
              ) : null
            ) : (
              slices.map((slice) => {
                if (!slice.path) return null;
                return (
                  <NativePath
                    key={`slice-${slice.index}`}
                    d={slice.path}
                    fill={slice.color}
                    fillOpacity={selectedIdx === null || slice.isSelected ? 1 : 0.4}
                  />
                );
              })
            )}
          </NativeG>
        </NativeSvg>
      );
    }

    // Fallback ring if native module is absent
    return (
      <View
        style={[
          styles.fallbackCircle,
          {
            width: outerRadius * 2,
            height: outerRadius * 2,
            borderRadius: outerRadius,
            borderWidth: outerRadius - innerRadius,
          },
        ]}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.chartAndLegendRow}>
        {/* SVG Donut Chart with Center Hole */}
        <View style={[styles.svgWrapper, { width: size, height: size }]}>
          {renderSvgChart()}

          {/* Center Hole Content (Absolute Overlay) */}
          <TouchableOpacity
            style={[
              styles.centerHole,
              {
                width: innerRadius * 2 - 4,
                height: innerRadius * 2 - 4,
                borderRadius: innerRadius,
                left: cx - innerRadius + 2,
                top: cy - innerRadius + 2,
              },
            ]}
            onPress={() => handleSelect(null)}
            activeOpacity={0.8}
          >
            {activeCategory ? (
              <View style={styles.centerTextWrap}>
                <Text style={[styles.centerPercent, { color: activeCategory.color || colors.primary }]}>
                  {Math.round(activeCategory.percentage || 0)}%
                </Text>
                <Text style={styles.centerLabel} numberOfLines={1}>
                  {activeCategory.name}
                </Text>
              </View>
            ) : (
              <View style={styles.centerTextWrap}>
                <Text style={styles.centerMainNumber}>
                  {validCategories.length}
                </Text>
                <Text style={styles.centerLabel}>Categories</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Legend on the Right */}
        {Boolean(showLegend) ? (
          <View style={styles.legendContainer}>
            {validCategories.map((cat, idx) => {
              const color = cat.color || CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
              const isSelected = selectedIdx === idx;

              return (
                <TouchableOpacity
                  key={`leg-${cat.name || idx}-${idx}`}
                  style={[
                    styles.legendItem,
                    isSelected && styles.legendItemActive,
                  ]}
                  onPress={() => handleSelect(idx)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <Text
                    style={[
                      styles.legendText,
                      isSelected && styles.legendTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  chartAndLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  svgWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerHole: {
    position: 'absolute',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  centerTextWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  centerPercent: {
    fontSize: 16,
    fontWeight: '800',
  },
  centerMainNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  centerLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 1,
  },
  legendContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  legendItemActive: {
    backgroundColor: '#F3F4F6',
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    flexShrink: 1,
  },
  legendTextActive: {
    fontWeight: '800',
    color: colors.text,
  },
  fallbackCircle: {
    borderColor: colors.primary,
    backgroundColor: '#fff',
  },
});
