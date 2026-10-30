import { jsPDF } from 'jspdf';

/**
 * Cleanly converts assistant response or modified text into a downloadable PDF document
 * with proper pagination, margins, word wrapping, and elegant styling.
 */
export function exportToPdf(content, filename = 'atelier-document.pdf') {
  if (!content) return false;

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const maxLineWidth = pageWidth - (margin * 2);

    // Clean markdown characters while preserving structure
    const cleanLines = content
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link text](url) -> link text
      .replace(/\*\*([^*]+)\*\*/g, '$1')       // **bold** -> bold
      .replace(/\*([^*]+)\*/g, '$1')           // *italic* -> italic
      .replace(/`([^`]+)`/g, '$1')             // `code` -> code
      .split('\n');

    let currentY = 22;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(33, 37, 41);

    // Header title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(40, 44, 52);
    doc.text('Document Export', margin, currentY);
    currentY += 8;

    // Divider line
    doc.setDrawColor(220, 224, 230);
    doc.setLineWidth(0.4);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(45, 55, 72);

    const lineHeight = 5.8;

    for (let i = 0; i < cleanLines.length; i++) {
      let line = cleanLines[i].trim();

      if (!line) {
        currentY += lineHeight * 0.7;
        continue;
      }

      // Check for headings
      if (line.startsWith('# ')) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(20, 25, 35);
        line = line.replace(/^#\s*/, '');
      } else if (line.startsWith('## ')) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.5);
        doc.setTextColor(30, 35, 45);
        line = line.replace(/^##\s*/, '');
      } else if (line.startsWith('### ')) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(40, 45, 55);
        line = line.replace(/^###\s*/, '');
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(45, 55, 72);
      }

      const splitText = doc.splitTextToSize(line, maxLineWidth);

      for (let j = 0; j < splitText.length; j++) {
        if (currentY + lineHeight > pageHeight - margin) {
          doc.addPage();
          currentY = margin + 4;
        }
        doc.text(splitText[j], margin, currentY);
        currentY += lineHeight;
      }
    }

    const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    doc.save(safeName);
    return true;
  } catch (err) {
    console.error('PDF generation error:', err);
    return false;
  }
}
