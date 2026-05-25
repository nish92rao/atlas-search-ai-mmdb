// server.js - MongoDB Movie Database Backend Server
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const utilsModule = require('./utils');
const appModule = require('./app');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// API ENDPOINTS
// ============================================

/**
 * POST /api/search/exact
 * Exact match search endpoint
 *
 * Request body:
 * {
 *   "query": "string",
 *   "field": "title|cast|plot",
 *   "sort": ""|"year"|"rating"
 * }
 */
app.post('/api/search/exact', async (req, res) => {
    try {
        const { query, field, sort } = req.body;

        if (!query || !field) {
            return res.status(400).json({
                error: 'Query and field are required',
                example: { query: 'The Matrix', field: 'title', sort: 'year' }
            });
        }

        const results = await appModule.exactMatchSearch(query, field, sort || '');
        res.json(results);
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/suggestions
 * Get autocomplete suggestions for full text search
 */
app.post('/api/suggestions', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query || query.length < 2) {
            return res.status(400).json({
                error: 'Query must be at least 2 characters'
            });
        }

        const results = await appModule.autocompleteTitle(query);

        // Extract just the titles
        const suggestions = results.map(doc => doc.title);

        console.log(`✓ Autocomplete suggestions: "${query}" - Found ${suggestions.length} suggestions`);
        res.json(suggestions);
    } catch (error) {
        console.error('✗ Suggestions error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/search/fulltext
 * Full text search endpoint
 *
 * Request body:
 * {
 *   "query": "string"
 * }
 */
app.post('/api/search/fulltext', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({
                error: 'Query is required',
                example: { query: 'action adventure' }
            });
        }

        const results = await appModule.fullTextSearch(query);
        res.json(results);
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/search/vector
 * Vector search endpoint
 *
 * Request body:
 * {
 *   "query": "string"
 * }
 */
app.post('/api/search/vector', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({
                error: 'Query is required',
                example: { query: 'action adventure' }
            });
        }

        const results = await appModule.vectorSearch(query);
        res.json(results);
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/search/hybrid
 * Hybrid search endpoint
 *
 * Request body:
 * {
 *   "query": "string",
 *   "ftsWeight": number,
 *   "vectorWeight": number
 * }
 */
app.post('/api/search/hybrid', async (req, res) => {
    try {
        const { query, ftsWeight, vectorWeight, hybridApproach } = req.body;

        if (!query) {
            return res.status(400).json({
                error: 'Query is required',
                example: { query: 'action adventure', ftsWeight: 0.5, vectorWeight: 0.5 }
            });
        }

        const results = await appModule.hybridSearch(query, ftsWeight, vectorWeight, hybridApproach);
        res.json(results);
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/search/facets
 * Get faceted search results for genres, ratings, and release dates
 *
 * Request body:
 * {
 *   "query": "string"
 * }
 */
app.post('/api/search/facets', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({
                error: 'Query is required',
                example: { query: 'action' }
            });
        }

        const results = await appModule.searchFacets(query);
        res.json(results);
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /discover
 * RAG chat endpoint for discussing current search results.
 *
 * Request body:
 * {
 *   "query": "string",
 *   "context": [{ "title": "string", "year": number, "plot": "string", "cast": ["string"] }]
 * }
 *
 * Response body:
 * {
 *   "response": "string"
 * }
 */
app.post('/discover', async (req, res) => {
    try {
        if (!utilsModule.getConfig('ragEnabled')) {
            return res.status(403).json({ error: 'RAG is disabled' });
        }

        const { query, context } = req.body;

        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return res.status(400).json({
                error: 'Query is required',
                example: { query: 'Suggest suspense movies from these results', context: [] }
            });
        }

        if (!Array.isArray(context)) {
            return res.status(400).json({
                error: 'Context must be an array',
                example: { query: 'What should I watch?', context: [] }
            });
        }

        const responseText = await appModule.discoverResponse(query, context);

        res.json({ response: responseText });
    } catch (error) {
        console.error('Discover API error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/config
 * Lightweight frontend config endpoint.
 */
app.get('/api/config', (req, res) => {
    res.json({
        autocompleteEnabled: utilsModule.getConfig('autocompleteEnabled'),
        facetsEnabled: utilsModule.getConfig('facetsEnabled'),
        vectorSearchEnabled: utilsModule.getConfig('vectorSearchEnabled'),
        ragEnabled: utilsModule.getConfig('ragEnabled'),
        agenticEnabled: utilsModule.getConfig('agenticEnabled')
    });
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'Server is running',
        timestamp: new Date(),
        config: {
                database: utilsModule.getConfig('database'),
                collection: utilsModule.getConfig('collectionName'),
                embeddedCollection: utilsModule.getConfig('embeddedCollectionName')
        }
    });
});

/**
 * POST /api/search/chatbot
 * AI Mode search endpoint for conversational queries about movies.
 *
 * Request body:
 * {
 *   "query": "string",
 *   "aiMode": "rag|full"
 * }
 *
 * Response body:
 * {
 *   "response": "string"
 * }
 */
app.post('/api/search/chatbot', async (req, res) => {
    try {
        if (!utilsModule.getConfig('ragEnabled')) {
            return res.status(403).json({ error: 'AI Mode is disabled' });
        }

        const { query, aiMode, sessionId } = req.body;

        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return res.status(400).json({
                error: 'Query is required',
                example: { query: 'What are the best action movies?', aiMode: 'rag' }
            });
        }

        const resolvedSessionId = typeof sessionId === 'string' && sessionId.trim().length > 0
            ? sessionId.trim()
            : `${req.ip || 'anonymous'}:${req.get('user-agent') || 'unknown'}`;

        const responseText = await appModule.aiChatResponse(query, aiMode, resolvedSessionId);

        res.json({ response: responseText });
    } catch (error) {
        console.error('AI Chat API error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// START SERVER
// ============================================

const PORT = utilsModule.getConfig('port') || 3000;
const HOST = utilsModule.getConfig('host') || 'localhost';

utilsModule.connectToDatabase(utilsModule.getAllConfig()).then(() => {
    app.listen(PORT, HOST, () => {
        console.log('');
        console.log('╔════════════════════════════════════════╗');
        console.log('║  MongoDB Movie Database API Started    ║');
        console.log('╚════════════════════════════════════════╝');
        console.log('');
        console.log(`Server running at http://${HOST}:${PORT}`);
        console.log(`Health check: http://${HOST}:${PORT}/api/health`);
        console.log('');
        console.log('Open index.html in your browser to use the application.');
        console.log('');
    });
}).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

utilsModule.initializeLLM().catch(err => {
    console.error('Failed to initialize LLM:', err);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGINT', async () => {
    console.log('\n⏹ Shutting down gracefully...');
    await utilsModule.closeDatabase();
    process.exit(0);
});
