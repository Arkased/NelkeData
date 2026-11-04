import { z } from 'zod';
import { isPlaceholder } from '../placeholder.js';
import type { ReadTable } from './xml.js';

// A row without text is a label with no text: the lookups return ''.
const englishSchema = z.object({ NAME_LABEL: z.string(), NAME_ENGLISH: z.string().default('') });
const japaneseSchema = z.object({ NAME_LABEL: z.string(), NAME_JAPAN: z.string().default('') });

/** The game texts by label. */
export interface Messages {
  /** Returns the English text of a label, or '' when the label has none. */
  t: (label: string) => string;
  /** Returns the Japanese text of a label, or '' when the label has none. */
  jp: (label: string) => string;
  /** Tells whether the name that a label holds is a placeholder name. */
  isPlaceholder: (label: string) => boolean;
}

/**
 * Loads the English and Japanese message tables.
 * @param read - the table reader of the saves folder
 * @returns the text lookups
 * @sideEffects reads the message files through the table reader
 */
export function loadMessages(read: ReadTable): Messages {
  const en = new Map<string, string>();
  const jp = new Map<string, string>();
  for (const e of [...read('message_en/message.xml', englishSchema), ...read('message_en/expl_message_str.xml', englishSchema)]) {
    en.set(e.NAME_LABEL, e.NAME_ENGLISH);
  }
  for (const e of read('message/message.xml', japaneseSchema)) jp.set(e.NAME_LABEL, e.NAME_JAPAN);
  return {
    t: (label) => en.get(label) ?? '',
    jp: (label) => jp.get(label) ?? '',
    isPlaceholder: (label) => isPlaceholder(en.get(label) ?? '', jp.get(label) ?? ''),
  };
}
