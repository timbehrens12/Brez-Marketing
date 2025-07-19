import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import html2pdf from 'html-pdf';
import { Buffer } from 'buffer';

export async function POST(req: Request) {
  console.log('PDF export API called');
  
  try {
    // Parse request body
    const body = await req.json();
    const { html, filename } = body;
    
    if (!html) {
      console.error('Missing HTML content');
      return NextResponse.json(
        { error: 'Missing HTML content' },
        { status: 400 }
      );
    }
    
    console.log('Preparing HTML content for PDF conversion...');
    
    // Use JSDOM to sanitize and process the HTML
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Make sure all image paths are absolute
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      if (img.src && img.src.startsWith('/')) {
        img.src = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.brez.io'}${img.src}`;
      }
    });
    
    // Get the processed HTML
    const processedHtml = dom.serialize();
    
    console.log('Converting HTML to PDF...');
    
    // Configure PDF options
    const pdfOptions: html2pdf.CreateOptions = {
      format: 'A4',
      orientation: 'portrait',
      border: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      renderDelay: 1000,
      type: 'pdf'
    };
    
    // Convert HTML to PDF using html-pdf
    return new Promise((resolve) => {
      html2pdf.create(processedHtml, pdfOptions).toBuffer((err: Error | null, buffer: Buffer) => {
        if (err) {
          console.error('HTML to PDF conversion error:', err);
          resolve(NextResponse.json(
            { error: 'PDF generation failed' },
            { status: 500 }
          ));
          return;
        }
        
        console.log('PDF generated successfully, size:', buffer.length, 'bytes');
        
        resolve(new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename || 'report.pdf'}"`,
            'Content-Length': buffer.length.toString(),
          },
        }));
      });
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 