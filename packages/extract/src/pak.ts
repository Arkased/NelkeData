import fs from 'node:fs';

const ENTRY_SIZE = 168;
const HEADER_SIZE = 16;
const NAME_SIZE = 128;

/** A file in a PAK archive. */
export interface PakEntry {
  name: string;
  size: number;
  key: Buffer;
  offset: number;
}

function xorKey(buf: Buffer, key: Buffer): Buffer {
  if (key.every((b) => b === 0)) return buf;
  for (let i = 0; i < buf.length; i++) buf[i] = buf.readUInt8(i) ^ key.readUInt8(i % key.length);
  return buf;
}

/**
 * Reads the entry table of a Gust PAK archive (64-bit entry variant, as used by Nelke).
 * @param fd - the open archive file
 * @returns the entries in archive order
 * @sideEffects reads from the file descriptor
 */
export function readEntries(fd: number): PakEntry[] {
  const hdr = Buffer.alloc(HEADER_SIZE);
  fs.readSync(fd, hdr, 0, HEADER_SIZE, 0);
  const count = hdr.readUInt32LE(4);
  const table = Buffer.alloc(count * ENTRY_SIZE);
  fs.readSync(fd, table, 0, table.length, HEADER_SIZE);
  const dataStart = HEADER_SIZE + table.length;
  const entries: PakEntry[] = [];
  for (let i = 0; i < count; i++) {
    const e = table.subarray(i * ENTRY_SIZE, (i + 1) * ENTRY_SIZE);
    const key = Buffer.from(e.subarray(132, 152));
    const nameBuf = xorKey(Buffer.from(e.subarray(0, NAME_SIZE)), key);
    const end = nameBuf.indexOf(0);
    entries.push({
      name: nameBuf.subarray(0, end < 0 ? NAME_SIZE : end).toString('utf8'),
      size: e.readUInt32LE(NAME_SIZE),
      key,
      offset: Number(e.readBigUInt64LE(152)) + dataStart,
    });
  }
  return entries;
}

/**
 * Reads and decrypts the bytes of 1 archive entry.
 * @param fd - the open archive file
 * @param entry - the entry to read
 * @returns the decrypted file content
 * @sideEffects reads from the file descriptor
 */
export function readFile(fd: number, entry: PakEntry): Buffer {
  const buf = Buffer.alloc(entry.size);
  fs.readSync(fd, buf, 0, entry.size, entry.offset);
  return xorKey(buf, entry.key);
}
