import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { ProfileState, ProgressState } from '@mochilang/shared'
import LeagueScreen from './LeagueScreen'
import FriendsScreen from './FriendsScreen'
import { useT } from '../lib/i18n'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  progress: ProgressState
  profile: ProfileState
  setProfile: (patch: Partial<ProfileState>) => void
}

type SegmentView = 'league' | 'friends'

/**
 * Merged League + Friends tab with a segmented control. Both inner
 * screens render their own ScrollView and previously each grabbed
 * `useSafeAreaInsets()` for their top padding; now SocialScreen owns
 * the safe-area + segment header, and the inner screens render with
 * `nested` so they don't double up the inset.
 */
export default function SocialScreen({ progress, profile, setProfile }: Props) {
  const insets = useSafeAreaInsets()
  const t = useT()
  const [view, setView] = useState<SegmentView>('league')

  return (
    <View style={styles.shell}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + space.md },
        ]}
      >
        <View style={styles.segments}>
          <Segment
            label={t('social.tab.league')}
            active={view === 'league'}
            onPress={() => setView('league')}
          />
          <Segment
            label={t('social.tab.friends')}
            active={view === 'friends'}
            onPress={() => setView('friends')}
          />
        </View>
      </View>

      {view === 'league' ? (
        <LeagueScreen
          progress={progress}
          profile={profile}
          setProfile={setProfile}
          nested
        />
      ) : (
        <FriendsScreen nested />
      )}
    </View>
  )
}

function Segment({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.segment,
        active && styles.segmentActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  segments: {
    flexDirection: 'row',
    backgroundColor: colors.cream100,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 2,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  segmentText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontFamily: 'Nunito_900Black',
  },
  segmentTextActive: {
    color: colors.text,
  },
})
