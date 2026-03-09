const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');

class DocumentService {
  constructor() {
    this.chunkSize = 400; // 200 words per chunk
    this.chunkOverlap = 50; // words overlap between chunks
  }

  async processFile(filePath, originalName) {
    try {
      console.log(`🔄 Processing file: ${originalName}`);
    
      let text;
      if (originalName.toLowerCase().endsWith('.pdf')) {
        text = await this.extractPDFText(filePath);
      } else if (originalName.toLowerCase().endsWith('.txt')) {
        text = await this.extractTextFile(filePath);
      } else {
        throw new Error('Unsupported file type. Only PDF and TXT files are allowed.');
      }

      // Clean and validate text
      text = this.cleanText(text);
      if (!text || text.trim().length === 0) {
        throw new Error('No text content found in file');
      }

      // Split into chunks
      const chunks = this.chunkText(text, originalName);
      
      console.log(`✅ Processed ${originalName}: ${chunks.length} chunks generated`);
      
      return {
        fileName: originalName,
        totalChunks: chunks.length,
        chunks: chunks
      };
      
    } catch (error) {
      console.error(`❌ Error processing file ${originalName}:`, error);
      throw error;
    }
  }

  async extractPDFText(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      throw new Error(`Failed to extract PDF text: ${error.message}`);
    }
  }

  async extractTextFile(filePath) {
    try {
      const text = await fs.readFile(filePath, 'utf-8');
      return text;
    } catch (error) {
      throw new Error(`Failed to read text file: ${error.message}`);
    }
  }

  cleanText(text) {
    return text
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')       // Remove excessive line breaks
      .replace(/[^\x20-\x7E\n]/g, '')   // Remove non-ASCII characters except newlines
      .trim();
  }

  chunkText(text, fileName) {
    const words = text.split(/\s+/);
    const chunks = [];
    
    // Extract company name and document name (compulsory)
    const companyName = this.extractCompanyName(text, fileName);
    const documentName = fileName; // Document name from filename or input
    
    for (let i = 0; i < words.length; i += this.chunkSize - this.chunkOverlap) {
      const chunkWords = words.slice(i, i + this.chunkSize);
      if (chunkWords.length > 0) {
        const chunkText = chunkWords.join(' ').trim();
        
        chunks.push({
          text: chunkText,
          fileName: fileName,
          chunkIndex: Math.floor(i / (this.chunkSize - this.chunkOverlap)) + 1,
          wordCount: chunkWords.length,
          characterCount: chunkText.length,
          companyName: companyName, // Compulsory company name
          documentName: documentName, // Compulsory document name
          company_name: companyName, // Alternative field name for compatibility
          document_name: documentName // Alternative field name for compatibility
        });
      }
    }
    
    return chunks;
  }

  extractCompanyName(text, fileName) {
    // Try to extract company name from document content (compulsory)
    const companyPatterns = [
      // Common company name patterns
      /\b([A-Z][a-z]+(?:\s+(?:Inc|Corp|Corporation|Company|Co|Ltd|LLC|Group|Holdings|Technologies|Solutions|Systems|Services|Enterprises))\b)/gi,
      // Look for capitalized words that might be company names (2-3 words)
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g,
      // Single word company names (capitalized)
      /\b([A-Z][a-z]{4,})\b/g
    ];

    // Try to find company name in text
    for (const pattern of companyPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const companyName = matches[0];
        if (companyName.length > 2 && companyName.length < 50) {
          return companyName;
        }
      }
    }

    // Compulsory fallback: always return a company name
    const baseName = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    
    // If direct-input, generate company name from text
    if (baseName === 'direct-input') {
      // Find first capitalized word as company name
      const firstCapitalized = text.match(/\b([A-Z][a-z]+)\b/);
      if (firstCapitalized) {
        return firstCapitalized[1];
      }
      // Fallback: use first word
      const firstWord = text.split(/\s+/)[0];
      return firstWord || 'Unknown Company';
    }
    
    return baseName || 'Unknown Company';
  }

  async processDirectText(text, fileName = 'direct-input') {
    try {
      console.log(`🔄 Processing direct text input`);
      
      // Clean and validate text
      text = this.cleanText(text);
      if (!text || text.trim().length === 0) {
        throw new Error('Text content cannot be empty');
      }

      // Split into chunks
      const chunks = this.chunkText(text, fileName);
      
      console.log(`✅ Processed direct text: ${chunks.length} chunks generated`);
      
      return {
        fileName: fileName,
        totalChunks: chunks.length,
        chunks: chunks
      };
      
    } catch (error) {
      console.error(`❌ Error processing direct text:`, error);
      throw error;
    }
  }

  getStats() {
    return {
      service: 'document-processor',
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
      supportedFormats: ['.pdf', '.txt']
    };
  }
}

module.exports = { DocumentService };
