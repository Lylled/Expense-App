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
// Independent of the expense data itself - there's no link back to this file
// from a saved expense yet (see issue for viewing a receipt photo later).
export async function saveReceiptPhoto(mode: ReceiptStorageMode, sourceUri: string): Promise<void> {
  if (mode === 'none') return;

  if (mode === 'device') {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) return;
    await MediaLibrary.saveToLibraryAsync(sourceUri);
    return;
  }

  const directory = new Directory(Paths.document, 'kuitit');
  if (!directory.exists) directory.create({ intermediates: true });
  await new File(sourceUri).copy(directory);
}
