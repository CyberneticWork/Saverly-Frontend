import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { productsAPI } from '../../services/api';
import { colors, typography } from '../../theme';

// Conditionally load react-native-svg for native platforms
let NativeSvg = null;
let NativePath = null;
let NativeCircle = null;
let NativeLine = null;
let NativeText = null;

if (Platform.OS !== 'web') {
  try {
    const svgModule = require('react-native-svg');
    NativeSvg = svgModule.default || svgModule.Svg;
    NativePath = svgModule.Path;
    NativeCircle = svgModule.Circle;
    NativeLine = svgModule.Line;
    NativeText = svgModule.Text;
  } catch (e) {
    // react-native-svg fallback
  }
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STORE_COLORS = [
  '#10B981', // Emerald / Green
  '#F59E0B', // Amber / Orange
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
];

export default function PriceChart({ productId }) {
  const [historyData, setHistoryData] = useState(null);
  const [singlePoint, setSinglePoint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [productId]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const res = await productsAPI.getPriceHistory(productId);
      const raw = res.data.data || [];

      if (raw.length === 0) {
        setHistoryData(null);
        setSinglePoint(null);
        setIsLoading(false);
        return;
      }

      // Group records by store
      const byStore = {};
      raw.forEach((record) => {
        const storeName = record.supermarket?.name || 'Supermarket';
        if (!byStore[storeName]) byStore[storeName] = [];
        byStore[storeName].push({
          date: record.recordedAt ? record.recordedAt.split('T')[0] : '',
          price: Number(record.price || 0),
        });
      });

      const storeNames = Object.keys(byStore).slice(0, 4);
      if (storeNames.length === 0) {
        setIsLoading(false);
        return;
      }

      // Collect all distinct dates sorted ascending
      const allDates = [...new Set(raw.map((r) => r.recordedAt?.split('T')[0]).filter(Boolean))].sort();

      // If only 1 date exists, display single point summary card
      if (allDates.length <= 1) {
        const first = raw[0];
        setSinglePoint({
          storeName: first.supermarket?.name || 'Supermarket',
          price: Number(first.price || 0),
          date: first.recordedAt ? new Date(first.recordedAt).toLocaleDateString() : 'Recent',
        });
        setHistoryData(null);
        setIsLoading(false);
        return;
      }

      // Limit to last 8 dates for clean display
      const displayDates = allDates.slice(-8);

      // Find overall min and max prices across stores
      let minP = Infinity;
      let maxP = -Infinity;

      const series = storeNames.map((store, idx) => {
        const storeRecords = byStore[store];
        let lastVal = storeRecords[0]?.price || 0;

        const points = displayDates.map((date) => {
          const found = storeRecords.find((r) => r.date === date);
          if (found && found.price > 0) {
            lastVal = found.price;
          }
          if (lastVal < minP) minP = lastVal;
          if (lastVal > maxP) maxP = lastVal;
          return lastVal;
        });

        return {
          store,
          color: STORE_COLORS[idx % STORE_COLORS.length],
          data: points,
          latestPrice: lastVal,
        };
      });

      if (minP === Infinity || maxP === -Infinity) {
        minP = 0;
        maxP = 100;
      } else if (minP === maxP) {
        minP = Math.max(0, minP * 0.9);
        maxP = maxP * 1.1;
      }

      setHistoryData({
        labels: displayDates.map((d) => (d.length >= 10 ? d.slice(5) : d)), // MM-DD
        series,
        minPrice: minP,
        maxPrice: maxP,
      });
      setSinglePoint(null);
    } catch (err) {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Price trend temporarily unavailable</Text>
      </View>
    );
  }

  // Single recorded price point
  if (singlePoint) {
    return (
      <View style={styles.singleCard}>
        <View style={styles.singleHeader}>
          <Text style={styles.singleStore}>{singlePoint.storeName}</Text>
          <Text style={styles.singleDate}>{singlePoint.date}</Text>
        </View>
        <Text style={styles.singlePrice}>
          LKR {singlePoint.price.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
        </Text>
        <Text style={styles.singleNote}>
          Recorded on receipt. Additional scans will generate trend comparison.
        </Text>
      </View>
    );
  }

  if (!historyData || historyData.series.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No price history available yet</Text>
      </View>
    );
  }

  const chartWidth = Math.min(SCREEN_WIDTH - 48, 540);
  const chartHeight = 170;
  const padLeft = 44;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 26;
  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;

  const { labels, series, minPrice, maxPrice } = historyData;
  const priceRange = maxPrice - minPrice || 1;

  // Midpoint price for grid
  const midPrice = (minPrice + maxPrice) / 2;

  // Render on Web using native HTML5 SVG
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <svg
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ overflow: 'visible', width: '100%', maxWidth: chartWidth }}
        >
          {/* Background Grid Lines */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={chartWidth - padRight}
            y2={padTop}
            stroke="#E2E8F0"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <line
            x1={padLeft}
            y1={padTop + plotH / 2}
            x2={chartWidth - padRight}
            y2={padTop + plotH / 2}
            stroke="#E2E8F0"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <line
            x1={padLeft}
            y1={padTop + plotH}
            x2={chartWidth - padRight}
            y2={padTop + plotH}
            stroke="#CBD5E1"
            strokeWidth="1"
          />

          {/* Y-Axis Value Labels */}
          <text x={padLeft - 6} y={padTop + 4} textAnchor="end" fontSize="10" fill="#64748B" fontWeight="600">
            {Math.round(maxPrice)}
          </text>
          <text x={padLeft - 6} y={padTop + plotH / 2 + 3} textAnchor="end" fontSize="10" fill="#64748B">
            {Math.round(midPrice)}
          </text>
          <text x={padLeft - 6} y={padTop + plotH + 2} textAnchor="end" fontSize="10" fill="#64748B">
            {Math.round(minPrice)}
          </text>

          {/* Lines and Data Dots */}
          {series.map((s) => {
            const numPoints = s.data.length;
            const pointsCoords = s.data.map((val, i) => {
              const x = padLeft + (i / Math.max(1, numPoints - 1)) * plotW;
              const y = padTop + plotH - ((val - minPrice) / priceRange) * plotH;
              return { x, y, val };
            });

            const pathD = pointsCoords
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(' ');

            return (
              <g key={s.store}>
                <path d={pathD} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" />
                {pointsCoords.map((p, idx) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill="#FFFFFF"
                    stroke={s.color}
                    strokeWidth="2"
                  />
                ))}
              </g>
            );
          })}

          {/* X-Axis Date Labels */}
          {labels.map((date, i) => {
            const x = padLeft + (i / Math.max(1, labels.length - 1)) * plotW;
            return (
              <text key={i} x={x} y={chartHeight - 6} textAnchor="middle" fontSize="10" fill="#64748B">
                {date}
              </text>
            );
          })}
        </svg>

        {/* Legend */}
        <View style={styles.legend}>
          {series.map((s) => (
            <View key={s.store} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <Text style={styles.legendText}>
                {s.store}: <Text style={styles.legendPrice}>LKR {s.latestPrice.toFixed(0)}</Text>
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Render on Mobile (Native)
  if (NativeSvg) {
    return (
      <View style={styles.container}>
        <NativeSvg width={chartWidth} height={chartHeight}>
          {/* Grid lines */}
          <NativeLine
            x1={padLeft}
            y1={padTop}
            x2={chartWidth - padRight}
            y2={padTop}
            stroke="#E2E8F0"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
          <NativeLine
            x1={padLeft}
            y1={padTop + plotH / 2}
            x2={chartWidth - padRight}
            y2={padTop + plotH / 2}
            stroke="#E2E8F0"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
          <NativeLine
            x1={padLeft}
            y1={padTop + plotH}
            x2={chartWidth - padRight}
            y2={padTop + plotH}
            stroke="#CBD5E1"
            strokeWidth={1}
          />

          {/* Y Axis text */}
          <NativeText x={padLeft - 6} y={padTop + 4} textAnchor="end" fontSize={10} fill="#64748B">
            {Math.round(maxPrice).toString()}
          </NativeText>
          <NativeText x={padLeft - 6} y={padTop + plotH + 2} textAnchor="end" fontSize={10} fill="#64748B">
            {Math.round(minPrice).toString()}
          </NativeText>

          {/* Series lines */}
          {series.map((s) => {
            const numPoints = s.data.length;
            const pointsCoords = s.data.map((val, i) => {
              const x = padLeft + (i / Math.max(1, numPoints - 1)) * plotW;
              const y = padTop + plotH - ((val - minPrice) / priceRange) * plotH;
              return { x, y };
            });

            const pathD = pointsCoords
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(' ');

            return (
              <React.Fragment key={s.store}>
                <NativePath d={pathD} fill="none" stroke={s.color} strokeWidth={2.5} />
                {pointsCoords.map((p, idx) => (
                  <NativeCircle key={idx} cx={p.x} cy={p.y} r={3.5} fill="#FFFFFF" stroke={s.color} strokeWidth={2} />
                ))}
              </React.Fragment>
            );
          })}
        </NativeSvg>

        <View style={styles.legend}>
          {series.map((s) => (
            <View key={s.store} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <Text style={styles.legendText}>
                {s.store}: <Text style={styles.legendPrice}>LKR {s.latestPrice.toFixed(0)}</Text>
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Fallback for native devices without react-native-svg
  return (
    <View style={styles.singleCard}>
      <Text style={styles.singleStore}>{series[0]?.store || 'Supermarket'}</Text>
      <Text style={styles.singlePrice}>LKR {series[0]?.latestPrice?.toFixed(2)}</Text>
      <Text style={styles.singleNote}>Price trend recorded across {labels.length} updates.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  center: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  empty: {
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  singleCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  singleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  singleStore: {
    ...typography.body,
    fontWeight: '700',
    color: '#166534',
  },
  singleDate: {
    ...typography.caption,
    color: '#15803D',
  },
  singlePrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#14532D',
    marginVertical: 4,
  },
  singleNote: {
    ...typography.caption,
    color: '#4ADE80',
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#64748B',
  },
  legendPrice: {
    fontWeight: '700',
    color: '#1E293B',
  },
});
