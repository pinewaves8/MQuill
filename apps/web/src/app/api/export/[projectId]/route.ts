import { NextResponse } from 'next/server';
import { projectStore, chapterStore, draftSegmentStore } from '@/lib/db/projects-store';
import { detectDuplicateParagraphs } from '@/lib/validation/content-validator';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

interface ChapterWithContent {
  id: string;
  title: string;
  content: string;
}

interface ExportQualityIssue {
  type: 'length_gate' | 'duplicate_paragraph';
  severity: 'high' | 'medium' | 'low';
  message: string;
  chapterId?: string;
  chapterTitle?: string;
  threshold?: number;
  actual?: number;
  samples?: Array<{ paragraphIndex: number; sample: string }>;
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

    const project = await projectStore.getById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const chapters = await chapterStore.getByProject(projectId);
    const chaptersWithDrafts = await Promise.all(
      chapters.map(async (chapter) => {
        const segments = await draftSegmentStore.getByChapter(chapter.id);
        const content = segments.map((s) => s.content).join('\n\n');
        return { ...chapter, content };
      })
    );

    chaptersWithDrafts.sort((a, b) => a.sortOrder - b.sortOrder);

    const qualityIssues = validateExportQuality(
      chaptersWithDrafts.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        content: chapter.content,
      })),
      project.targetLength
    );

    if (qualityIssues.length > 0) {
      return NextResponse.json(
        {
          error: 'Export quality gate failed',
          data: {
            issues: qualityIssues,
          },
        },
        { status: 400 }
      );
    }

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

function validateExportQuality(
  chapters: ChapterWithContent[],
  targetLength: string
): ExportQualityIssue[] {
  const issues: ExportQualityIssue[] = [];
  const totalChars = chapters.reduce((sum, chapter) => sum + countChars(chapter.content), 0);
  const minChars = getMinCharsForTargetLength(targetLength);

  if (totalChars < minChars) {
    issues.push({
      type: 'length_gate',
      severity: 'high',
      message: `导出字数不足：总字数 ${totalChars} 低于最低要求 ${minChars}`,
      threshold: minChars,
      actual: totalChars,
    });
  }

  for (const chapter of chapters) {
    const duplicates = detectDuplicateParagraphs(chapter.content);

    if (duplicates.length > 0) {
      const paragraphs = chapter.content.split(/\n\n+/).filter(p => p.trim().length > 0);
      const duplicateRatio = duplicates.length / Math.max(paragraphs.length, 1);

      issues.push({
        type: 'duplicate_paragraph',
        severity: duplicateRatio > 0.1 ? 'high' : duplicateRatio > 0.05 ? 'medium' : 'low',
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        message: `检测到 ${duplicates.length} 个重复段落（重复率 ${(duplicateRatio * 100).toFixed(1)}%）`,
        threshold: 0.05,
        actual: duplicateRatio,
        samples: duplicates.slice(0, 3).map(d => ({
          paragraphIndex: d.index1,
          sample: d.sample,
        })),
      });
    }
  }

  return issues;
}

function getMinCharsForTargetLength(targetLength: string): number {
  if (targetLength === 'long') {
    return 50000;
  }

  if (targetLength === 'mid') {
    return 15000;
  }

  return 4800;
}


function countChars(text: string): number {
  return text.replace(/\s+/g, '').length;
}

function exportMarkdown(title: string, chapters: Array<{ title: string; content: string }>) {
  let markdown = `# ${title}\n\n`;

  chapters.forEach((chapter) => {
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
  } catch {
    doc.setFont('helvetica');
  }

  doc.setFontSize(24);
  doc.text(title, 105, 20, { align: 'center' });

  let yPos = 35;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const lineHeight = 8;

  chapters.forEach((chapter) => {
    if (!chapter.content.trim()) return;

    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.text(chapter.title, margin, yPos);
    yPos += lineHeight + 3;

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
  const uuid = generateUUID();

  const manifestItems = chapters.map((_, i) =>
    `    <item id="chapter${i + 1}" href="chapter${i + 1}.xhtml" media-type="application/xhtml+xml"/>`
  ).join('\n');

  const spineItems = chapters.map((_, i) =>
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

  const navPoints = chapters.map((chapter, i) =>
    `    <navPoint id="navpoint${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapeXml(chapter.title)}</text></navLabel>
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

  const navList = chapters.map((chapter, i) =>
    `      <li><a href="chapter${i + 1}.xhtml">${escapeXml(chapter.title)}</a></li>`
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

  const chapterFiles = chapters.map((chapter, i) => {
    const paragraphs = chapter.content.split('\n\n').map((p) => `<p>${escapeXml(p)}</p>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(chapter.title)}</title>
</head>
<body>
  <h1>${escapeXml(chapter.title)}</h1>
${paragraphs}
</body>
</html>`;
  });

  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  const epubContent = [
    { path: 'mimetype', content: 'application/epub+zip' },
    { path: 'META-INF/container.xml', content: containerXml },
    { path: 'OEBPS/toc.ncx', content: tocNcx },
    { path: 'OEBPS/nav.xhtml', content: navXhtml },
    { path: 'OEBPS/content.opf', content: contentOpf },
    ...chapterFiles.map((content, i) => ({
      path: `OEBPS/chapter${i + 1}.xhtml`,
      content,
    })),
  ];

  const zipContent = generateSimpleZip(epubContent);

  return new NextResponse(zipContent, {
    headers: {
      'Content-Type': 'application/epub+zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.epub"`,
    },
  });
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    const value = char === 'x' ? random : (random & 0x3 | 0x8);
    return value.toString(16);
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
  const chunks: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const content = new TextEncoder().encode(file.content);
    const pathBytes = new TextEncoder().encode(file.path);

    const header = new Uint8Array(30 + pathBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, crc32(content), true);
    view.setUint32(18, content.length, true);
    view.setUint32(22, content.length, true);
    view.setUint16(26, pathBytes.length, true);
    view.setUint16(28, 0, true);
    header.set(pathBytes, 30);

    chunks.push(header);
    chunks.push(content);

    const centralEntry = new Uint8Array(46 + pathBytes.length);
    const entryView = new DataView(centralEntry.buffer);

    entryView.setUint32(0, 0x02014b50, true);
    entryView.setUint16(4, 20, true);
    entryView.setUint16(6, 20, true);
    entryView.setUint16(8, 0, true);
    entryView.setUint16(10, 0, true);
    entryView.setUint16(12, 0, true);
    entryView.setUint16(14, 0, true);
    entryView.setUint32(16, crc32(content), true);
    entryView.setUint32(20, content.length, true);
    entryView.setUint32(24, content.length, true);
    entryView.setUint16(28, pathBytes.length, true);
    entryView.setUint16(30, 0, true);
    entryView.setUint16(32, 0, true);
    entryView.setUint16(34, 0, true);
    entryView.setUint16(36, 0, true);
    entryView.setUint32(38, 0, true);
    entryView.setUint32(42, offset, true);
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

  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, centralDirectory.length, true);
  endView.setUint16(10, centralDirectory.length, true);
  endView.setUint32(12, centralDirSize, true);
  endView.setUint32(16, centralDirOffset, true);
  endView.setUint16(20, 0, true);

  chunks.push(endRecord);

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let position = 0;
  for (const chunk of chunks) {
    result.set(chunk, position);
    position += chunk.length;
  }

  return result.buffer;
}

const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let value = i;
    for (let j = 0; j < 8; j++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crc32Table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
