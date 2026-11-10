import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { useTheme } from '../../theme';
import { createBackup, restoreBackup } from '../../storage/backup';
import { MAX_BACKUP_SIZE, parseBackup, summarizeBackup, type Backup } from '../../storage/backup-format';

export function BackupScreen({ onBack, onRestored }: { onBack: () => void; onRestored: () => void }) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [candidate, setCandidate] = useState<Backup | null>(null);
  const [exportText, setExportText] = useState('');
  const review = (text: string) => {
    setCandidate(null); setError(''); setMessage('');
    try { setCandidate(parseBackup(text)); } catch (e) { setError((e as Error).message); }
  };
  const download = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const backup = await createBackup();
      const text = JSON.stringify(backup, null, 2);
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url; link.download = `mochiread-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        setMessage('Backup file prepared. Keep it somewhere you can access on your other device.');
      } else { setExportText(text); }
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const chooseFile = () => {
    setCandidate(null); setError(''); setMessage('');
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > MAX_BACKUP_SIZE) { setError('This backup is too large (maximum 20 MB).'); return; }
      try { review(await file.text()); } catch { setError('Couldn’t read this file. Please choose it again.'); }
    };
    input.click();
  };
  const restore = async () => {
    if (!candidate || busy) return;
    setBusy(true); setError('');
    try { await restoreBackup(candidate); onRestored(); }
    catch (e) { setError((e as Error).message); setBusy(false); }
  };
  const button = (label: string, onPress: () => void, destructive = false) => <Pressable
    accessibilityRole="button" accessibilityLabel={label} disabled={busy} onPress={onPress}
    style={({ pressed }) => [s.button, { backgroundColor: destructive ? theme.destructive : theme.accent, opacity: busy || pressed ? 0.6 : 1 }]}>
    <Text style={s.buttonText}>{label}</Text>
  </Pressable>;
  return <View style={[s.root, { backgroundColor: theme.bg }]}>
    <AppHeader title="Backup & restore" leading="back" onLeadingPress={() => { if (!busy) onBack(); }} />
    <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
      <Text style={[s.title, { color: theme.text }]}>Take your reading with you</Text>
      <Text style={[s.copy, { color: theme.textMuted }]}>Back up both languages: saved texts, vocabulary and flashcard progress, settings, reading positions, and activity. Dictionaries are downloaded separately and aren’t included. No account is needed.</Text>
      {button('Download backup', download)}
      {!!exportText && <TextInput accessibilityLabel="Backup JSON to copy" multiline editable={false} value={exportText} style={[s.input, { color: theme.text, borderColor: theme.border }]} />}
      <Text style={[s.title, { color: theme.text, marginTop: 16 }]}>Restore on this device</Text>
      <Text style={[s.copy, { color: theme.textMuted }]}>Choose a MochiRead backup file or paste its contents. You’ll review it before restoring.</Text>
      {Platform.OS === 'web' && button('Choose backup file', chooseFile)}
      <TextInput accessibilityLabel="Paste backup JSON" placeholder="Paste backup JSON here" placeholderTextColor={theme.textSubtle}
        multiline value={draft} editable={!busy} onChangeText={(value) => { setDraft(value); setCandidate(null); }}
        style={[s.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} />
      {button('Review pasted backup', () => review(draft))}
      {candidate && <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[s.title, { color: theme.text }]}>Review backup</Text>
        <Text style={[s.copy, { color: theme.textMuted }]}>Created {new Date(candidate.createdAt).toLocaleString()}</Text>
        {summarizeBackup(candidate).map((summary) => <Text key={summary.language} style={[s.copy, { color: theme.text }]}>
          {summary.language === 'ja' ? 'Japanese' : 'Chinese'}: {summary.texts} texts · {summary.words} saved words
        </Text>)}
        <Text style={[s.copy, { color: theme.text }]}>Restoring replaces this browser’s saved data for both languages, including settings and review progress. Download a backup of this browser first if you want to keep it.</Text>
        {button('Restore this backup', restore, true)}
        {button('Cancel restore', () => setCandidate(null))}
      </View>}
      {busy && <Text accessibilityLiveRegion="polite" style={[s.copy, { color: theme.text }]}>Working…</Text>}
      {!!message && <Text accessibilityLiveRegion="polite" style={[s.copy, { color: theme.text }]}>{message}</Text>}
      {!!error && <Text accessibilityRole="alert" style={[s.copy, { color: theme.destructive }]}>{error}</Text>}
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1 }, body: { padding: 20, gap: 14, width: '100%', maxWidth: 720, alignSelf: 'center' },
  title: { fontSize: 20, fontWeight: '700' }, copy: { fontSize: 15, lineHeight: 23 },
  button: { padding: 14, borderRadius: 12, alignItems: 'center' }, buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  input: { minHeight: 120, maxHeight: 220, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 13, textAlignVertical: 'top' },
  card: { padding: 18, borderWidth: 1, borderRadius: 14, gap: 14 },
});
