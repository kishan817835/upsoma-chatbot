const fs = require('fs').promises;
const path = require('path');

class DocumentService {
  constructor() {
    this.chunkSize = parseInt(process.env.CHUNK_SIZE) || 200;
    this.chunkOverlap = parseInt(process.env.CHUNK_OVERLAP) || 50;
  }

  async processFile(filePath, originalName) {
    try {
      console.log(`🔄 Processing file: ${originalName}`);
      
      let text;
      if (originalName.toLowerCase().endsWith('.txt')) {
        text = await this.extractTextFile(filePath);
      } else {
        throw new Error('Only TXT files are supported in production deployment');
      }
      
      const chunks = this.chunkText(text, originalName);
      
      return {
        text: text,
        chunks: chunks,
        totalChunks: chunks.length,
        fileName: originalName
      };
      
    } catch (error) {
      console.error('❌ Error processing file:', error);
      throw error;
    }
  }

  async extractTextFile(filePath) {
    try {
      const text = await fs.readFile(filePath, 'utf-8');
      return text;
    } catch (error) {
      console.error('❌ Error reading text file:', error);
      throw error;
    }
  }

  async processText(text, fileName, companyName) {
    try {
      console.log(`🔄 Processing text: ${fileName}`);
      
      const chunks = this.chunkText(text, fileName, companyName);
      
      return {
        text: text,
        chunks: chunks,
        totalChunks: chunks.length,
        fileName: fileName
      };
      
    } catch (error) {
      console.error('❌ Error processing text:', error);
      throw error;
    }
  }

  chunkText(text, fileName, companyName) {
    const words = text.split(/\s+/);
    const chunks = [];
    
    // Extract company name and document name (compulsory)
    if (!companyName) {
      companyName = this.extractCompanyName(text, fileName);
    }
    
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
          documentName: documentName // Compulsory document name
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
