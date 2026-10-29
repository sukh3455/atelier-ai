import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker using unpkg / cdnjs to avoid local worker bundling issues in browser
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    const numPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= Math.min(numPages, 30); pageNum++) { // Read up to 30 pages
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `\n--- [Page ${pageNum}] ---\n` + pageText;
    }

    if (numPages > 30) {
      fullText += `\n\n[Note: Document has ${numPages} pages. First 30 pages were extracted for analysis.]`;
    }

    return {
      text: fullText.trim(),
      numPages,
      name: file.name
    };
  } catch (err) {
    console.error('PDF parsing error:', err);
    throw new Error('Failed to parse PDF: ' + err.message);
  }
}
