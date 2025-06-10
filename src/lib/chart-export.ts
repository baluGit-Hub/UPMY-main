import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Exports a chart element as an image
 * @param elementId The ID of the element to export
 * @param fileName The name of the file to save (without extension)
 */
export const exportChartAsImage = async (elementId: string, fileName: string): Promise<void> => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better quality
      backgroundColor: '#ffffff',
      logging: false,
    });

    canvas.toBlob((blob: Blob | null) => {
      if (blob) {
        saveAs(blob, `${fileName}.png`);
      }
    });
  } catch (error) {
    console.error('Error exporting chart as image:', error);
    throw error;
  }
};

/**
 * Exports a chart element as a PDF
 * @param elementId The ID of the element to export
 * @param fileName The name of the file to save (without extension)
 * @param title Optional title to include in the PDF
 */
export const exportChartAsPDF = async (
  elementId: string,
  fileName: string,
  title?: string
): Promise<void> => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
    });

    // Add title if provided
    if (title) {
      pdf.setFontSize(16);
      pdf.text(title, 14, 15);
      pdf.setFontSize(12);
      pdf.text(new Date().toLocaleDateString(), 14, 22);
      // Add image below the title
      const imgWidth = 280;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 14, 30, imgWidth, imgHeight);
    } else {
      // Add image without title
      const imgWidth = 280;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 14, 14, imgWidth, imgHeight);
    }

    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Error exporting chart as PDF:', error);
    throw error;
  }
};

/**
 * Exports a table of issues as a CSV file
 * @param issues The issues to export
 * @param fileName The name of the file to save (without extension)
 */
export const exportIssuesAsCSV = (issues: any[], fileName: string): void => {
  try {
    if (!issues || issues.length === 0) {
      throw new Error('No issues to export');
    }

    // Get all unique keys from all issues
    const allKeys = new Set<string>();
    issues.forEach((issue) => {
      Object.keys(issue).forEach((key) => {
        // Skip complex objects that wouldn't translate well to CSV
        if (
          typeof issue[key] !== 'object' ||
          issue[key] === null ||
          key === 'status' ||
          key === 'issuetype' ||
          key === 'assignee' ||
          key === 'priority'
        ) {
          allKeys.add(key);
        }
      });
    });

    // Add special keys for flattened objects
    allKeys.delete('status');
    allKeys.delete('issuetype');
    allKeys.delete('assignee');
    allKeys.delete('priority');
    allKeys.add('status');
    allKeys.add('issueType');
    allKeys.add('assignee');
    allKeys.add('priority');

    // Convert keys to array and create header row
    const keys = Array.from(allKeys);
    let csv = keys.join(',') + '\n';

    // Add data rows
    issues.forEach((issue) => {
      const row = keys.map((key) => {
        let value = '';
        
        // Handle special flattened keys
        if (key === 'status' && issue.status) {
          value = issue.status.name || '';
        } else if (key === 'issueType' && issue.issuetype) {
          value = issue.issuetype.name || '';
        } else if (key === 'assignee' && issue.assignee) {
          value = issue.assignee.displayName || '';
        } else if (key === 'priority' && issue.priority) {
          value = issue.priority.name || '';
        } else if (issue[key] !== undefined && issue[key] !== null) {
          value = issue[key].toString();
        }
        
        // Escape quotes and wrap in quotes if contains comma
        if (value.includes('"')) {
          value = value.replace(/"/g, '""');
        }
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value}"`;
        }
        
        return value;
      });
      
      csv += row.join(',') + '\n';
    });

    // Create and download the file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `${fileName}.csv`);
  } catch (error) {
    console.error('Error exporting issues as CSV:', error);
    throw error;
  }
};

/**
 * Prints a specific element
 * @param elementId The ID of the element to print
 * @param title Optional title to include in the print
 */
export const printElement = async (elementId: string, title?: string): Promise<void> => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Could not open print window');
    }

    printWindow.document.write('<html><head><title>Print</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: Arial, sans-serif; margin: 20px; }
      .header { margin-bottom: 20px; }
      .title { font-size: 24px; font-weight: bold; }
      .date { font-size: 14px; color: #666; margin-top: 5px; }
      .content { margin-top: 20px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; }
    `);
    printWindow.document.write('</style></head><body>');

    if (title) {
      printWindow.document.write('<div class="header">');
      printWindow.document.write(`<div class="title">${title}</div>`);
      printWindow.document.write(`<div class="date">Generated on ${new Date().toLocaleDateString()}</div>`);
      printWindow.document.write('</div>');
    }

    printWindow.document.write('<div class="content">');
    printWindow.document.write(element.outerHTML);
    printWindow.document.write('</div>');
    printWindow.document.write('</body></html>');

    printWindow.document.close();
    printWindow.focus();

    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  } catch (error) {
    console.error('Error printing element:', error);
    throw error;
  }
};
