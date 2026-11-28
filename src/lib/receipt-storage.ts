import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export type ReceiptStorageMode = 'none' | 'app' | 'device';

export const RECEIPT_STORAGE_MODES: readonly ReceiptStorageMode[] = ['none', 'app', 'device'];
export const RECEIPT_STORAGE_STORAGE_KEY = 'receipt-storage-mode';

export const RECEIPT_STORAGE_LABELS: Record<ReceiptStorageMode, string> = {
  none: 'Ei tallenneta',
  app: 'Sovelluksen muisti',
  device: 'Puhelimen muisti',
};

// Where a scanned receipt's photo ends up, per the user's Asetukset choice.
// Returns the photo's own URI when it can be read back later (app storage,
// to link onto the resulting expense rows), or null when there's nothing to
// link to: either nothing was saved, or it went to the phone's gallery,
// which has no stable URI this app can read back.
export async function saveReceiptPhoto(
  mode: ReceiptStorageMode,
  sourceUri: string
): Promise<string | null> {
  if (mode === 'none') return null;

  if (mode === 'device') {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) return null;
    await MediaLibrary.saveToLibraryAsync(sourceUri);
    return null;
  }

  const directory = new Directory(Paths.document, 'kuitit');
  if (!directory.exists) directory.create({ intermediates: true });
  const destination = new File(directory, `${Date.now()}.jpg`);
  await new File(sourceUri).copy(destination);
  return destination.uri;
}
