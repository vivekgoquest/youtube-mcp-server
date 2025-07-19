import { KeywordExtractionOptions, KeywordData } from '../types.js';
import nlp from 'compromise';

export class TextProcessor {
  private static readonly DEFAULT_STOP_WORDS = [
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must',
    'youtube', 'video', 'channel', 'subscribe', 'like', 'comment', 'share', 'watch',
    'very', 'really', 'just', 'now', 'here', 'there', 'then', 'than', 'also', 'only',
    'about', 'after', 'all', 'any', 'as', 'back', 'because', 'before', 'between', 'both',
    'but', 'came', 'can', 'come', 'could', 'did', 'do', 'each', 'from', 'get', 'got',
    'had', 'has', 'have', 'he', 'her', 'here', 'him', 'himself', 'his', 'how', 'if',
    'into', 'is', 'it', 'its', 'just', 'like', 'make', 'many', 'me', 'might', 'more',
    'most', 'much', 'must', 'my', 'never', 'no', 'not', 'now', 'of', 'on', 'only',
    'or', 'other', 'our', 'out', 'over', 'said', 'same', 'see', 'should', 'since',
    'some', 'still', 'such', 'take', 'than', 'that', 'their', 'them', 'then', 'there',
    'these', 'they', 'this', 'those', 'through', 'time', 'too', 'two', 'up', 'us',
    'use', 'used', 'using', 'was', 'way', 'we', 'well', 'were', 'what', 'when',
    'where', 'which', 'while', 'who', 'will', 'with', 'would', 'you', 'your'
  ];

  /**
   * Extract keywords from text with various options
   */
  static extractKeywords(text: string, options: KeywordExtractionOptions = {}): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const {
      minWordLength = 3,
      includeSingleWords = true,
      includeStopWords = false,
      includeNGrams = true,
      nGramSize = 3,
      maxKeywords = 100
    } = options;

    // Clean and normalize text
    const cleanedText = this.cleanText(text);
    
    // Extract single words
    let keywords: string[] = [];
    
    if (includeSingleWords) {
      const words = this.extractWords(cleanedText, minWordLength);
      keywords.push(...words);
    }

    // Extract n-grams (phrases)
    if (includeNGrams) {
      for (let n = 2; n <= nGramSize; n++) {
        const nGrams = this.generateNGrams(cleanedText, n);
        keywords.push(...nGrams);
      }
    }

    // Remove stop words if requested
    if (!includeStopWords) {
      keywords = this.removeStopWords(keywords);
    }

    // Remove duplicates and sort by relevance
    const uniqueKeywords = [...new Set(keywords)];
    
    // Calculate relevance scores and sort
    const scoredKeywords = uniqueKeywords
      .map(keyword => ({
        keyword,
        relevance: this.calculateKeywordRelevance(keyword, cleanedText)
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxKeywords)
      .map(item => item.keyword);

    return scoredKeywords;
  }

  /**
   * Clean and normalize text for processing
   */
  static cleanText(text: string): string {
    return text
      // Remove HTML tags
      .replace(/<[^>]*>/g, ' ')
      // Remove URLs
      .replace(/https?:\/\/[^\s]+/g, ' ')
      // Remove email addresses
      .replace(/\S+@\S+\.\S+/g, ' ')
      // Remove special characters but keep spaces and hyphens
      .replace(/[^\w\s-]/g, ' ')
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      // Convert to lowercase
      .toLowerCase()
      // Trim whitespace
      .trim();
  }

  /**
   * Extract individual words from text
   */
  private static extractWords(text: string, minLength: number): string[] {
    return text
      .split(/\s+/)
      .filter(word => word.length >= minLength)
      .map(word => word.trim())
      .filter(word => word.length > 0);
  }

  /**
   * Generate n-grams (phrases of n words) from text
   */
  static generateNGrams(text: string, n: number): string[] {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const nGrams: string[] = [];

    for (let i = 0; i <= words.length - n; i++) {
      const nGram = words.slice(i, i + n).join(' ');
      if (nGram.trim().length > 0) {
        nGrams.push(nGram);
      }
    }

    return nGrams;
  }

  /**
   * Calculate keyword relevance score based on frequency and context
   */
  static calculateKeywordRelevance(keyword: string, context: string): number {
    const keywordLower = keyword.toLowerCase();
    const contextLower = context.toLowerCase();
    
    // Count occurrences
    const occurrences = (contextLower.match(new RegExp(keywordLower, 'g')) || []).length;
    
    // Calculate frequency score
    const frequencyScore = occurrences / contextLower.split(/\s+/).length;
    
    // Bonus for longer phrases (they're usually more specific)
    const lengthBonus = keyword.split(/\s+/).length * 0.1;
    
    // Penalty for very common words
    const commonWordPenalty = this.isCommonWord(keyword) ? -0.2 : 0;
    
    return frequencyScore + lengthBonus + commonWordPenalty;
  }

  /**
   * Remove stop words from keyword list
   */
  static removeStopWords(keywords: string[], language: string = 'en'): string[] {
    return keywords.filter(keyword => {
      const words = keyword.toLowerCase().split(/\s+/);
      
      // Check if any word in the phrase is a stop word
      const hasStopWord = words.some(word => 
        this.DEFAULT_STOP_WORDS.includes(word)
      );
      
      return !hasStopWord;
    });
  }

  /**
   * Check if a keyword is a common word that should be penalized
   */
  private static isCommonWord(keyword: string): boolean {
    const commonWords = [
      'video', 'youtube', 'channel', 'subscribe', 'like', 'comment', 'share',
      'watch', 'new', 'best', 'top', 'how', 'what', 'why', 'when', 'where',
      'good', 'great', 'amazing', 'awesome', 'cool', 'nice', 'fun', 'easy'
    ];
    
    return commonWords.includes(keyword.toLowerCase());
  }

  /**
   * Stem words to their root form (basic implementation)
   */
  static stemWords(keywords: string[]): string[] {
    return keywords.map(keyword => {
      // Use compromise.js for basic stemming
      const doc = nlp(keyword);
      return doc.verbs().toInfinitive().text() || 
             doc.nouns().toSingular().text() || 
             keyword;
    });
  }

  /**
   * Extract entities (people, places, organizations) from text
   */
  static extractEntities(text: string): { people: string[]; places: string[]; organizations: string[] } {
    const doc = nlp(text);
    
    return {
      people: doc.people().out('array'),
      places: doc.places().out('array'),
      organizations: doc.organizations().out('array')
    };
  }

  /**
   * Calculate text similarity between two strings
   */
  static calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(this.cleanText(text1).split(/\s+/));
    const words2 = new Set(this.cleanText(text2).split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Group similar keywords together
   */
  static groupSimilarKeywords(keywords: string[], threshold: number = 0.7): string[][] {
    const groups: string[][] = [];
    const processed = new Set<string>();

    for (const keyword of keywords) {
      if (processed.has(keyword)) continue;

      const group = [keyword];
      processed.add(keyword);

      for (const otherKeyword of keywords) {
        if (processed.has(otherKeyword)) continue;

        const similarity = this.calculateSimilarity(keyword, otherKeyword);
        if (similarity >= threshold) {
          group.push(otherKeyword);
          processed.add(otherKeyword);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Extract hashtags from text
   */
  static extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : [];
  }

  /**
   * Extract mentions from text
   */
  static extractMentions(text: string): string[] {
    const mentionRegex = /@[\w]+/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(mention => mention.substring(1).toLowerCase()) : [];
  }

  /**
   * Calculate keyword density in text
   */
  static calculateKeywordDensity(keyword: string, text: string): number {
    const cleanedText = this.cleanText(text);
    const words = cleanedText.split(/\s+/);
    const keywordOccurrences = (cleanedText.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
    
    return words.length > 0 ? keywordOccurrences / words.length : 0;
  }
}
