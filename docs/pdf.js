/* Tiny PDF maker: puts page pictures (JPEG) into an A4 PDF. No libraries needed, works offline. */
(function (root) {
  function makePdf(pages, title) {
    const enc = new TextEncoder(), parts = [], offs = [];
    let len = 0;
    const push = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
    const begin = n => { offs[n] = len; push(n + ' 0 obj\n'); };
    const n = pages.length, total = 3 + n * 3;
    push('%PDF-1.4\n'); push(new Uint8Array([37, 226, 227, 207, 211, 10]));
    begin(1); push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    begin(2); push('<< /Type /Pages /Count ' + n + ' /Kids [' + pages.map((_, i) => (3 + i * 3) + ' 0 R').join(' ') + '] >>\nendobj\n');
    pages.forEach((p, i) => {
      const pg = 3 + i * 3, ct = pg + 1, im = pg + 2, content = 'q 595.28 0 0 841.89 0 0 cm /Im0 Do Q';
      begin(pg); push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ' + im + ' 0 R >> >> /Contents ' + ct + ' 0 R >>\nendobj\n');
      begin(ct); push('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream\nendobj\n');
      begin(im); push('<< /Type /XObject /Subtype /Image /Width ' + p.w + ' /Height ' + p.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.jpeg.length + ' >>\nstream\n');
      push(p.jpeg); push('\nendstream\nendobj\n');
    });
    const info = total;
    begin(info); push('<< /Title (' + String(title || 'Statement').replace(/[^\x20-\x7e]/g, '').replace(/[()\\]/g, '') + ') /Producer (ECOLaver) >>\nendobj\n');
    const xr = len;
    push('xref\n0 ' + (info + 1) + '\n0000000000 65535 f \n');
    for (let i = 1; i <= info; i++) push(String(offs[i]).padStart(10, '0') + ' 00000 n \n');
    push('trailer\n<< /Size ' + (info + 1) + ' /Root 1 0 R /Info ' + info + ' 0 R >>\nstartxref\n' + xr + '\n%%EOF\n');
    const out = new Uint8Array(len); let o = 0;
    parts.forEach(b => { out.set(b, o); o += b.length; });
    return out;
  }
  root.makePdf = makePdf;
})(window);
