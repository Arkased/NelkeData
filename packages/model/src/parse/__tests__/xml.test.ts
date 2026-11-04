import { describe, expect, it } from 'vitest';
import { decodeXml, parseElements } from '../xml.js';

describe('decodeXml', () => {
  it('turns a line break tag into a space', () => {
    expect(decodeXml('one&lt;CR&gt;two')).toBe('one two');
  });

  it('drops the markup tags', () => {
    expect(decodeXml('&lt;RED&gt;Fire&lt;END&gt;')).toBe('Fire');
  });

  it('decodes the XML escapes', () => {
    expect(decodeXml('&lt;a&gt; &quot;b&quot; &apos;c&apos;')).toBe('<a> "b" \'c\'');
  });

  it('decodes &amp; last, so an escaped escape stays text', () => {
    expect(decodeXml('&amp;lt;')).toBe('&lt;');
  });
});

describe('parseElements', () => {
  it('reads the attributes of each elem as decoded strings', () => {
    const text = '<root>\n  <elem ID="A" NAME="x &amp; y"/>\n  <elem ID="B" NAME=""/>\n</root>';

    expect(parseElements(text)).toEqual([
      { ID: 'A', NAME: 'x & y' },
      { ID: 'B', NAME: '' },
    ]);
  });

  it('ignores text that is not an elem', () => {
    expect(parseElements('<root><other ID="A"/></root>')).toEqual([]);
  });
});
