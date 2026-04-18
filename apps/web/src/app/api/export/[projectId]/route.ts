import { NextResponse } from 'next/server';
import { projectStore, chapterStore, draftSegmentStore } from '@/lib/db/projects-store';
import { jsPDF } from 'jspdf';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET /api/export/[projectId]?format=markdown|pdf|epub - Export project
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'markdown';

    // Fetch project
    const project = await projectStore.getById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch chapters
    const chapters = await chapterStore.getByProject(projectId);

    // Fetch drafts for all chapters
    const chaptersWithDrafts = await Promise.all(
      chapters.map(async (chapter) => {
        const segments = await draftSegmentStore.getByChapter(chapter.id);
        const content = segments.map((s) => s.content).join('\n\n');
        return { ...chapter, content };
      })
    );

    // Sort chapters by sortOrder
    chaptersWithDrafts.sort((a, b) => a.sortOrder - b.sortOrder);

    switch (format) {
      case 'markdown':
        return exportMarkdown(project.title, chaptersWithDrafts);
      case 'pdf':
        return exportPdf(project.title, chaptersWithDrafts);
      case 'epub':
        return exportEpub(project.title, chaptersWithDrafts);
      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error exporting project:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}

function exportMarkdown(title: string, chapters: Array<{ title: string; content: string }>) {
  let markdown = `# ${title}\n\n`;

  chapters.forEach((chapter, index) => {
    if (chapter.content.trim()) {
      markdown += `## ${chapter.title}\n\n${chapter.content}\n\n`;
    }
  });

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.md"`,
    },
  });
}

async function exportPdf(title: string, chapters: Array<{ title: string; content: string }>) {
  const { jsPDF } = await import('jspdf');
  const fs = await import('fs');

  const doc = new jsPDF();

  // Try to add Chinese font if available
  try {
    const fontPath = 'C:/Windows/Fonts/simhei.ttf';
    if (fs.existsSync(fontPath)) {
      const fontData = fs.readFileSync(fontPath);
      const fontBase64 = fontData.toString('base64');
      doc.addFileToVFS('simhei.ttf', fontBase64);
      doc.addFont('simhei.ttf', 'SimHei', 'normal');
      doc.setFont('SimHei');
    } else {
      doc.setFont('helvetica');
    }
  } catch (e) {
    doc.setFont('helvetica');
  }

  // Add title
  doc.setFontSize(24);
  doc.text(title, 105, 20, { align: 'center' });

  let yPos = 35;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const lineHeight = 8;

  chapters.forEach((chapter) => {
    if (!chapter.content.trim()) return;

    // Check if we need a new page for chapter title
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 20;
    }

    // Add chapter title
    doc.setFontSize(16);
    doc.text(chapter.title, margin, yPos);
    yPos += lineHeight + 3;

    // Add chapter content
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(chapter.content, 170);

    lines.forEach((line: string) => {
      if (yPos > pageHeight - 15) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, margin, yPos);
      yPos += lineHeight;
    });

    yPos += 10;
  });

  const pdfArrayBuffer = doc.output('arraybuffer');

  return new NextResponse(pdfArrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.pdf"`,
    },
  });
}

function exportEpub(title: string, chapters: Array<{ title: string; content: string }>) {
  // Generate simple EPUB structure
  const uuid = generateUUID();
  const now = new Date().toISOString();

  // Build content.opf
  const manifestItems = chapters.map((ch, i) =>
    `    <item id="chapter${i + 1}" href="chapter${i + 1}.xhtml" media-type="application/xhtml+xml"/>`
  ).join('\n');

  const spineItems = chapters.map((ch, i) =>
    `    <itemref idref="chapter${i + 1}"/>`
  ).join('\n');

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>zh-CN</dc:language>
    <dc:identifier id="BookId">urn:uuid:${uuid}</dc:identifier>
    <meta name="generator" content="MQuill"/>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
${manifestItems}
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>`;

  // Build toc.ncx
  const navPoints = chapters.map((ch, i) =>
    `    <navPoint id="navpoint${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
      <content src="chapter${i + 1}.xhtml"/>
    </navPoint>`
  ).join('\n');

  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`;

  // Build nav.xhtml
  const navList = chapters.map((ch, i) =>
    `      <li><a href="chapter${i + 1}.xhtml">${escapeXml(ch.title)}</a></li>`
  ).join('\n');

  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${escapeXml(title)}</title>
</head>
<body>
  <nav epub:type="toc">
    <h1>目录</h1>
    <ol>
${navList}
    </ol>
  </nav>
</body>
</html>`;

  // Build chapter XHTML files
  const chapterFiles = chapters.map((ch, i) => {
    const paragraphs = ch.content.split('\n\n').map(p => `<p>${escapeXml(p)}</p>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(ch.title)}</title>
</head>
<body>
  <h1>${escapeXml(ch.title)}</h1>
${paragraphs}
</body>
</html>`;
  });

  // Build mimetype
  const mimetype = 'application/epub+zip';

  // Build container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  // Create EPUB (ZIP) structure
  // Note: This is a simplified EPUB. For production, use a proper EPUB library.
  const epubContent = [
    { path: 'mimetype', content: mimetype },
    { path: 'META-INF/container.xml', content: containerXml },
    { path: 'OEBPS/toc.ncx', content: tocNcx },
    { path: 'OEBPS/nav.xhtml', content: navXhtml },
    { path: 'OEBPS/content.opf', content: contentOpf },
    ...chapterFiles.map((content, i) => ({
      path: `OEBPS/chapter${i + 1}.xhtml`,
      content
    }))
  ];

  // Generate a simple ZIP file
  const zipContent = generateSimpleZip(epubContent);

  return new NextResponse(zipContent, {
    headers: {
      'Content-Type': 'application/epub+zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.epub"`,
    },
  });
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateSimpleZip(files: Array<{ path: string; content: string }>): ArrayBuffer {
  // This is a simplified ZIP generator
  // For production, use a proper ZIP library like archiver or yazl

  const chunks: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const content = new TextEncoder().encode(file.content);
    const pathBytes = new TextEncoder().encode(file.path);

    // Local file header
    const header = new Uint8Array(30 + pathBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x04034b50, true); // signature
    view.setUint16(4, 20, true); // version needed
    view.setUint16(6, 0, true); // flags
    view.setUint16(8, 0, true); // compression (store)
    view.setUint16(10, 0, true); // mod time
    view.setUint16(12, 0, true); // mod date
    view.setUint32(14, crc32(content), true); // crc32
    view.setUint32(18, content.length, true); // compressed size
    view.setUint32(22, content.length, true); // uncompressed size
    view.setUint16(26, pathBytes.length, true); // path length
    view.setUint16(28, 0, true); // extra length

    header.set(pathBytes, 30);

    chunks.push(header);
    chunks.push(content);

    const centralEntry = new Uint8Array(46 + pathBytes.length);
    const entryView = new DataView(centralEntry.buffer);

    entryView.setUint32(0, 0x02014b50, true); // signature
    entryView.setUint16(4, 20, true); // version made by
    entryView.setUint16(6, 20, true); // version needed
    entryView.setUint16(8, 0, true); // flags
    entryView.setUint16(10, 0, true); // compression
    entryView.setUint16(12, 0, true); // mod time
    entryView.setUint16(14, 0, true); // mod date
    entryView.setUint32(16, crc32(content), true); // crc32
    entryView.setUint32(20, content.length, true); // compressed size
    entryView.setUint32(24, content.length, true); // uncompressed size
    entryView.setUint16(28, pathBytes.length, true); // path length
    entryView.setUint16(30, 0, true); // extra length
    entryView.setUint16(32, 0, true); // comment length
    entryView.setUint16(34, 0, true); // disk number
    entryView.setUint16(36, 0, true); // internal attrs
    entryView.setUint32(38, 0, true); // external attrs
    entryView.setUint32(42, offset, true); // relative offset
    centralEntry.set(pathBytes, 46);

    centralDirectory.push(centralEntry);

    offset += header.length + content.length;
  });

  const centralDirOffset = offset;
  let centralDirSize = 0;

  centralDirectory.forEach((entry) => {
    chunks.push(entry);
    centralDirSize += entry.length;
  });

  // End of central directory
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);

  endView.setUint32(0, 0x06054b50, true); // signature
  endView.setUint16(4, 0, true); // disk number
  endView.setUint16(6, 0, true); // disk with central dir
  endView.setUint16(8, centralDirectory.length, true); // entries on disk
  endView.setUint16(10, centralDirectory.length, true); // total entries
  endView.setUint32(12, centralDirSize, true); // central dir size
  endView.setUint32(16, centralDirOffset, true); // central dir offset
  endView.setUint16(20, 0, true); // comment length

  chunks.push(endRecord);

  // Combine all chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }

  return result.buffer;
}

// CRC32 table
const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = crc32Table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}