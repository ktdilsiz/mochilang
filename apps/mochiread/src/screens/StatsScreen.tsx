import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import {
  computeStreak,
  statsForDate,
  statsLastNDays,
  todayKey,
  useStore,
  type DayStats,
} from '../state';
import { useTheme, type Theme } from '../theme';

type Props = {
  onBack: () => void;
};

export function StatsScreen({ onBack }: Props) {
  const { stats } = useStore();
  const theme = useTheme();

  const streak = useMemo(() => computeStreak(stats), [stats]);
  const today = statsForDate(stats, todayKey()) ?? {
    date: todayKey(),
    wordTaps: 0,
    secondsRead: 0,
  };
  const last7 = useMemo(() => statsLastNDays(stats, 7), [stats]);
  const totals = useMemo(
    () => ({
      taps: stats.reduce((a, b) => a + b.wordTaps, 0),
      seconds: stats.reduce((a, b) => a + b.secondsRead, 0),
      days: stats.filter((d) => d.wordTaps > 0 || d.secondsRead > 0).length,
    }),
    [stats]
  );

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <AppHeader title="Stats" leading="back" onLeadingPress={onBack} />
      <ScrollView contentContainerStyle={s.body}>
        <StreakCard streak={streak} theme={theme} />

        <Section title="Today" theme={theme}>
          <View style={s.statRow}>
            <Stat
              label="Words tapped"
              value={today.wordTaps.toString()}
              theme={theme}
            />
            <Stat
              label="Time read"
              value={formatDuration(today.secondsRead)}
              theme={theme}
            />
          </View>
        </Section>

        <Section title="Last 7 days" theme={theme}>
          <SevenDayChart days={last7} theme={theme} />
        </Section>

        <Section title="All time" theme={theme}>
          <View style={s.statRow}>
            <Stat
              label="Words tapped"
              value={totals.taps.toLocaleString()}
              theme={theme}
            />
            <Stat
              label="Time read"
              value={formatDuration(totals.seconds)}
              theme={theme}
            />
            <Stat
              label="Active days"
              value={totals.days.toString()}
              theme={theme}
            />
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

function StreakCard({ streak, theme }: { streak: number; theme: Theme }) {
  const subtitle =
    streak === 0
      ? 'Tap any word today to start one.'
      : streak === 1
      ? "You're on day 1. Come back tomorrow."
      : `${streak} days in a row. Don't break it!`;
  return (
    <View
      style={[
        s.streakCard,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <Text style={s.streakIcon}>🔥</Text>
      <View style={s.streakText}>
        <Text style={[s.streakValue, { color: theme.text }]}>
          {streak} {streak === 1 ? 'day' : 'days'}
        </Text>
        <Text style={[s.streakSubtitle, { color: theme.textMuted }]}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function Section({
  title,
  theme,
  children,
}: {
  title: string;
  theme: Theme;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: theme.textMuted }]}>{title}</Text>
      <View
        style={[
          s.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: Theme;
}) {
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[s.statLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

function SevenDayChart({ days, theme }: { days: DayStats[]; theme: Theme }) {
  const max = Math.max(60, ...days.map((d) => d.secondsRead));
  return (
    <View style={s.chart}>
      {days.map((d) => {
        const ratio = max > 0 ? d.secondsRead / max : 0;
        const heightPct = Math.max(d.secondsRead > 0 ? 8 : 4, ratio * 100);
        const filled = d.secondsRead > 0;
        return (
          <View key={d.date} style={s.chartCol}>
            <View style={s.chartBarTrack}>
              <View
                style={[
                  s.chartBar,
                  {
                    height: `${heightPct}%`,
                    backgroundColor: filled ? theme.accent : theme.border,
                  },
                ]}
              />
            </View>
            <Text style={[s.chartLabel, { color: theme.textSubtle }]}>
              {dayShort(d.date)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function dayShort(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins ? `${hours}h ${remMins}m` : `${hours}h`;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 16, gap: 16, paddingBottom: 32 },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  streakIcon: { fontSize: 36 },
  streakText: { flex: 1 },
  streakValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  streakSubtitle: { fontSize: 13, marginTop: 2 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  chart: {
    flexDirection: 'row',
    height: 96,
    alignItems: 'flex-end',
    gap: 8,
  },
  chartCol: { flex: 1, alignItems: 'center', gap: 6, height: '100%' },
  chartBarTrack: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  chartLabel: { fontSize: 10, fontWeight: '600' },
});
