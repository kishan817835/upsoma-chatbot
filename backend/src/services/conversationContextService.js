class ConversationContextService {
  constructor() {
    this.conversations = new Map(); // sessionId -> conversation history
    this.maxHistoryLength = 5; // Keep last 5 messages
  }

  // Get or create conversation session
  getConversation(sessionId = 'default') {
    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, {
        messages: [],
        entities: new Map(), // entity -> count
        lastUpdated: new Date()
      });
    }
    return this.conversations.get(sessionId);
  }

  // Add message to conversation history
  addMessage(sessionId, message, type = 'user') {
    const conversation = this.getConversation(sessionId);
    
    conversation.messages.push({
      text: message,
      type: type, // 'user' or 'assistant'
      timestamp: new Date(),
      entities: this.extractEntities(message)
    });

    // Keep only last N messages
    if (conversation.messages.length > this.maxHistoryLength) {
      conversation.messages = conversation.messages.slice(-this.maxHistoryLength);
    }

    // Update entity counts
    this.updateEntityCounts(conversation, message);
    conversation.lastUpdated = new Date();
  }

  // Extract entities (names, skills, projects, etc.) from message
  extractEntities(message) {
    const entities = [];
    
    // Common patterns for entities
    const patterns = [
      // Names (capitalized words)
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
      // Skills/technologies
      /\b(javascript|python|react|node|angular|vue|mongodb|mysql|postgresql|docker|kubernetes|aws|azure|gcp|html|css|java|spring|dotnet|php|laravel|ruby|rails|go|rust|scala|swift|kotlin|typescript)\b/gi,
      // Projects/keywords
      /\b(project|portfolio|website|app|application|software|system|platform|tool|service|api|database|algorithm|framework|library|package|module|component)\b/gi
    ];

    patterns.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches) {
        entities.push(...matches.map(match => match.toLowerCase()));
      }
    });

    return [...new Set(entities)]; // Remove duplicates
  }

  // Update entity frequency counts
  updateEntityCounts(conversation, message) {
    const entities = this.extractEntities(message);
    entities.forEach(entity => {
      conversation.entities.set(entity, (conversation.entities.get(entity) || 0) + 1);
    });
  }

  // Get context for current query based on conversation history
  getContextualQuery(sessionId, currentQuery) {
    const conversation = this.getConversation(sessionId);
    
    // If no history, return current query as-is
    if (conversation.messages.length === 0) {
      return currentQuery;
    }

    // Get recent entities (mentioned in last 5 messages)
    const recentEntities = Array.from(conversation.entities.keys())
      .filter(entity => conversation.entities.get(entity) >= 1)
      .slice(-10); // Top 10 recent entities

    // If current query is short and we have recent entities, enhance it
    if (currentQuery.split(' ').length <= 3 && recentEntities.length > 0) {
      const mostRelevantEntity = recentEntities[recentEntities.length - 1];
      return `${currentQuery} ${mostRelevantEntity}`;
    }

    return currentQuery;
  }

  // Get enhanced context for LLM
  getLLMContext(sessionId) {
    const conversation = this.getConversation(sessionId);
    
    if (conversation.messages.length === 0) {
      return '';
    }

    const recentMessages = conversation.messages.slice(-3); // Last 3 messages
    const entities = Array.from(conversation.entities.keys()).slice(-5); // Top 5 entities

    let context = '\n\nCONVERSATION CONTEXT:\n';
    context += 'Recent messages:\n';
    recentMessages.forEach(msg => {
      context += `${msg.type}: ${msg.text}\n`;
    });

    if (entities.length > 0) {
      context += `\nKey entities mentioned: ${entities.join(', ')}\n`;
    }

    return context;
  }

  // Check if query is about previously mentioned entity
  isFollowUpQuery(sessionId, currentQuery) {
    const conversation = this.getConversation(sessionId);
    const currentEntities = this.extractEntities(currentQuery);
    
    if (currentEntities.length === 0 || conversation.messages.length === 0) {
      return false;
    }

    // Check if current entities were mentioned in previous messages
    return currentEntities.some(entity => conversation.entities.has(entity));
  }

  // Get fallback suggestions when no results found
  getFallbackSuggestions(sessionId, query) {
    const conversation = this.getConversation(sessionId);
    const entities = Array.from(conversation.entities.keys());
    
    if (entities.length === 0) {
      return [];
    }

    // Return top entities as suggestions
    return entities.slice(-3).map(entity => ({
      text: entity,
      type: 'entity',
      relevance: conversation.entities.get(entity)
    }));
  }

  // Clean up old conversations (optional - for memory management)
  cleanup() {
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    
    for (const [sessionId, conversation] of this.conversations.entries()) {
      if (now - conversation.lastUpdated > oneHour) {
        this.conversations.delete(sessionId);
      }
    }
  }
}

module.exports = { ConversationContextService };
