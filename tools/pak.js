// Reader for Gust PAK archives (64-bit entry variant, as used by Nelke).
// Usage: node pak.js list <pak> [filter]
//        node pak.js extract <pak> <outDir> [filter]
const fs = require('fs');
const path = require('path');

const ENTRY_SIZE = 168;

function xorKey(buf, key) {
  if (key.every((b) => b === 0)) return buf;
  for (let i = 0; i < buf.length; i++) buf[i] ^= key[i % key.length];
  return buf;
}

function readEntries(fd) {
  const hdr = Buffer.alloc(16);
  fs.readSync(fd, hdr, 0, 16, 0);
  const count = hdr.readUInt32LE(4);
  const table = Buffer.alloc(count * ENTRY_SIZE);
  fs.readSync(fd, table, 0, table.length, 16);
  const dataStart = 16 + table.length;
  const entries = [];
  for (let i = 0; i < count; i++) {
    const e = table.subarray(i * ENTRY_SIZE, (i + 1) * ENTRY_SIZE);
    const key = Buffer.from(e.subarray(132, 152));
    const nameBuf = xorKey(Buffer.from(e.subarray(0, 128)), key);
    const end = nameBuf.indexOf(0);
    entries.push({
      name: nameBuf.subarray(0, end < 0 ? 128 : end).toString('utf8'),
      size: e.readUInt32LE(128),
      key,
      offset: Number(e.readBigUInt64LE(152)) + dataStart,
    });
  }
  return entries;
}

function readFile(fd, entry) {
  const buf = Buffer.alloc(entry.size);
  fs.readSync(fd, buf, 0, entry.size, entry.offset);
  return xorKey(buf, entry.key);
}

function main() {
  const [cmd, pak, a, b] = process.argv.slice(2);
  const fd = fs.openSync(pak, 'r');
  const entries = readEntries(fd);
  const filter = cmd === 'list' ? a : b;
  const re = filter ? new RegExp(filter, 'i') : null;
  const picked = re ? entries.filter((e) => re.test(e.name)) : entries;
  if (cmd === 'list') {
    for (const e of picked) console.log(`${e.size}\t${e.name}`);
  } else if (cmd === 'extract') {
    for (const e of picked) {
      const out = path.join(a, ...e.name.split(/[\\/]/).filter(Boolean));
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, readFile(fd, e));
    }
    console.log(`extracted ${picked.length} files`);
  }
}

if (require.main === module) main();
module.exports = { readEntries, readFile };
