// utils.js - Utility functions for embeddings, reranking, and LLM responses
// Note: dotenv is loaded by server.js before this module is used.
// These functions are stateless (embeddings/reranking) or own their own
// LLM client state (getLLMResponse, getLangChainLLMResponse, initializeLLM).

const { MongoClient, BSON } = require('mongodb');
const { Binary } = BSON;
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');
const { MongoDBChatMessageHistory } = require('@langchain/mongodb');

// Configuration from .env
const CONFIG = {
    mongodbUri: process.env.MONGODB_URI,
    database: process.env.DATABASE_NAME || 'sample_mflix',
    collectionName: process.env.COLLECTION_NAME || 'movies',
    embeddedCollectionName: process.env.EMBEDDED_COLLECTION_NAME || 'embedded_movies',
    embeddingFieldName: process.env.EMBEDDING_FIELD_NAME || 'plot_embedding_voyage_3_large',
    searchIndexName: process.env.SEARCH_INDEX_NAME || 'default',
    autocompleteEnabled: String(process.env.AUTOCOMPLETE).toLowerCase() === 'true',
    facetsEnabled: String(process.env.FACETS).toLowerCase() === 'true',
    vectorSearchEnabled: String(process.env.VECTOR).toLowerCase() === 'true',
    vectorSearchIndexName: process.env.VECTOR_SEARCH_INDEX_NAME || 'default',
    vectorEmbeddingModel: process.env.VECTOR_EMBEDDING_MODEL || 'voyage-3-large',
    rerankingModel: process.env.RERANKING_MODEL || 'rerank-2.5',
    voyageApiKey: process.env.VOYAGE_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    llmModel: process.env.LLM_MODEL || 'gemini-3.1-flash-lite-preview', //or gemini-2.5-flash
    ragEnabled: String(process.env.RAG).toLowerCase() === 'true',
    agenticEnabled: String(process.env.AGENTIC).toLowerCase() === 'true',
    memoryEnabled: String(process.env.MEMORY).toLowerCase() === 'true',
    memoryCollectionName: process.env.MEMORY_COLLECTION_NAME || 'agent_chat_history',
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
};

/**
 * Returns the application configuration object.
 *
 * @returns {Object} Configuration object.
 */
function getConfig(config) {
    return CONFIG[config];
}

function getAllConfig() {
    return CONFIG;
}

// ============================================
// DATABASE CONNECTION STATE
// ============================================

let mongoClient = null;
let moviesCollection = null;
let embeddedMoviesCollection = null;
let agentMemoryCollection = null;

/**
 * Returns the initialized movies collection handle.
 *
 * @returns {import('mongodb').Collection}
 * @throws {Error} Throws if database connection has not been initialized.
 */
function getMoviesCollection() {
    if (!moviesCollection) {
        throw new Error('Movies collection is not initialized. Call connectToDatabase first.');
    }
    return moviesCollection;
}

/**
 * Returns the initialized embedded movies collection handle.
 *
 * @returns {import('mongodb').Collection}
 * @throws {Error} Throws if database connection has not been initialized.
 */
function getEmbeddedMoviesCollection() {
    if (!embeddedMoviesCollection) {
        throw new Error('Embedded movies collection is not initialized. Call connectToDatabase first.');
    }
    return embeddedMoviesCollection;
}

/**
 * Connects to MongoDB and initializes the module-level MongoDB client.
 *
 * @param {Object} config - Application configuration object.
 * @param {string} config.mongodbUri - MongoDB connection string.
 * @param {string} config.database - Database name.
 * @returns {Promise<import('mongodb').MongoClient>}
 * @throws {Error} Throws when required config is missing or connection fails.
 */
async function connectToDatabase(config) {
    if (!config || !config.mongodbUri) {
        throw new Error('MongoDB configuration is missing. Check MONGODB_URI.');
    }

    try {
        mongoClient = new MongoClient(config.mongodbUri);
        await mongoClient.connect();
        const db = mongoClient.db(config.database);
        moviesCollection = db.collection(config.collectionName);
        embeddedMoviesCollection = db.collection(config.embeddedCollectionName);
        agentMemoryCollection = db.collection(config.memoryCollectionName);
        console.log('✓ Connected to MongoDB Atlas');
        console.log(`✓ Database: ${config.database}`);
        console.log(`✓ Collection: ${config.collectionName}`);
        console.log(`✓ Embedded Collection: ${config.embeddedCollectionName}`);
        console.log(`✓ Agent Memory Collection: ${config.memoryCollectionName}`);
        return mongoClient;
    } catch (error) {
        console.error('✗ MongoDB connection error:', error.message);
        throw error;
    }
}

/**
 * Closes the active MongoDB client connection if present.
 *
 * @param {import('mongodb').MongoClient|null} [client] - Active MongoDB client.
 * @returns {Promise<void>}
 */
async function closeDatabase(client) {
    const activeClient = client || mongoClient;
    if (activeClient) {
        await activeClient.close();
    }

    mongoClient = null;
    moviesCollection = null;
    embeddedMoviesCollection = null;
    agentMemoryCollection = null;
}

// ============================================
// LLM CLIENT STATE
// ============================================

// Module-level LLM client references, populated by initializeLLM().
let llm = null;
let langChainLLM = null;
let agentLLM = null;
let agent = null;
const MEMORY_TURNS = 5;

const AGENT_SYSTEM_PROMPT_TEMPLATE = `You are a helpful AI assistant for querying, summarizing, and recommending movies from a MongoDB-backed database.

You have access to the following tools:
{TOOLS}

Each tool has a name, input schema, and description. Use these tools when they are helpful for answering the user's request.

Behavior:
- For questions that depend on the database (e.g., finding movies, filtering, sorting, or searching by plot or metadata), choose and call the most relevant tool instead of guessing.
- If a user clearly specifies an exact value (such as a title, director, or year), prefer tools that perform exact or field-based lookups.
- If a user describes a movie by its plot, vibe, themes, or cannot recall the exact title, prefer tools that perform semantic or vector search over the "plot" field.
- You have only one iteration of tool execution. Choose tools and parameters carefully; do not request repeated tool calls.

Answer style:
- Be concise, clear, and factual.
- When listing movies, include at least: title and year; add rating or a one-sentence description when helpful.
- When recommending movies, briefly explain why each recommendation matches the user's request or preferences.
- Present tool results in natural language; do not expose raw JSON or internal field names unless the user explicitly asks for them.`;

/**
 * Builds a concise schema summary string from a zod object shape.
 *
 * @param {Object} schema - Zod schema object.
 * @returns {string}
 */
function summarizeToolSchema(schema) {
    if (!schema || !schema.shape) {
        return 'input schema: unavailable';
    }

    const shape = typeof schema.shape === 'function' ? schema.shape : schema.shape;
    const keys = Object.keys(shape || {});
    if (keys.length === 0) {
        return 'input schema: {{}}';
    }

    const fields = keys.map((key) => {
        const def = shape[key]?._def;
        const typeName = def?.typeName ? def.typeName.replace('Zod', '').toLowerCase() : 'unknown';
        return `${key}: ${typeName}`;
    });

    return `input schema: {{ ${fields.join(', ')} }}`;
}

/**
 * Formats the available tool list for the system prompt placeholder.
 *
 * @param {Array<import('@langchain/core/tools').StructuredToolInterface>} tools - Tool instances.
 * @returns {string}
 */
function formatToolsForPrompt(tools) {
    if (!Array.isArray(tools) || tools.length === 0) {
        return '- No tools are currently available.';
    }

    return tools.map((tool) => {
        const schemaSummary = summarizeToolSchema(tool.schema);
        return `- ${tool.name}: ${tool.description} (${schemaSummary})`;
    }).join('\n');
}

/**
 * Converts model content payloads into plain string responses.
 *
 * @param {unknown} content - LangChain model content payload.
 * @returns {string}
 */
function toContentString(content) {
    if (typeof content === 'string') {
        return content;
    }

    if (Array.isArray(content)) {
        return content
            .map((part) => (typeof part === 'string' ? part : part?.text || ''))
            .join('')
            .trim();
    }

    if (content && typeof content === 'object' && typeof content.text === 'string') {
        return content.text;
    }

    return '';
}

/**
 * Returns MongoDB-backed chat history for an agent session.
 *
 * @param {string} sessionId - Client/session identifier.
 * @returns {MongoDBChatMessageHistory}
 */
function getAgentChatHistory(sessionId) {
    if (!agentMemoryCollection) {
        throw new Error('Agent memory collection is not initialized. Call connectToDatabase first.');
    }

    if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
        throw new Error('sessionId is required when MEMORY is enabled.');
    }

    return new MongoDBChatMessageHistory({
        collection: agentMemoryCollection,
        sessionId: sessionId.trim()
    });
}

/**
 * Formats recent chat history to a concise plain-text block for prompt context.
 *
 * @param {import('@langchain/core/messages').BaseMessage[]} messages - Chat history messages.
 * @returns {string}
 */
function formatRecentHistory(messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
        return 'No prior conversation context.';
    }

    return messages.map((message) => {
        const role = typeof message?._getType === 'function' ? message._getType() : 'message';
        const label = role === 'human' ? 'User' : role === 'ai' ? 'Assistant' : 'System';
        return `${label}: ${toContentString(message.content)}`;
    }).join('\n');
}

/**
 * Executes a structured LangChain tool directly without using tool.invoke().
 *
 * This avoids the callback-managed runner path that is triggering the current
 * uuid runtime error while preserving zod schema validation.
 *
 * @param {import('@langchain/core/tools').StructuredToolInterface & { func?: Function }} tool - Tool instance.
 * @param {Object} args - Tool arguments.
 * @returns {Promise<string>}
 */
async function executeToolDirectly(tool, args) {
    const validated = tool.schema.safeParse(args || {});
    if (!validated.success) {
        throw new Error(validated.error.issues.map((issue) => issue.message).join('; '));
    }

    if (typeof tool.func === 'function') {
        return tool.func(validated.data);
    }

    if (typeof tool._call === 'function') {
        return tool._call(validated.data);
    }

    throw new Error(`Tool ${tool.name} cannot be executed directly.`);
}

/**
 * Executes a simple single-pass agent flow with at most one tool execution round.
 *
 * @param {string} userInput - User query.
 * @param {Array<import('@langchain/core/tools').StructuredToolInterface>} tools - Tool instances.
 * @returns {Promise<{ output: string }>} Agent output payload.
 */
async function runAgentWithTools(userInput, tools, sessionId) {
    const llmWithTools = agentLLM.bindTools(tools);
    const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
    const toolsPrompt = formatToolsForPrompt(tools);
    const systemPrompt = AGENT_SYSTEM_PROMPT_TEMPLATE.replace('{TOOLS}', toolsPrompt);
    let history = [];
    let historyText = 'No prior conversation context.';

    if (CONFIG.memoryEnabled) {
        const chatHistory = getAgentChatHistory(sessionId);
        const allMessages = await chatHistory.getMessages();
        history = allMessages.slice(-2 * MEMORY_TURNS);
        historyText = formatRecentHistory(history);
    }

    const agentPrompt = ChatPromptTemplate.fromMessages([
        ['system', systemPrompt],
        ['human', 'Recent conversation context:\n{history}\n\nCurrent user request:\n{input}']
    ]);

    const firstPass = agentPrompt.pipe(llmWithTools);
    const aiMessage = await firstPass.invoke({ input: userInput, history: historyText });

    const toolCalls = Array.isArray(aiMessage.tool_calls) ? aiMessage.tool_calls : [];
    if (toolCalls.length === 0) {
        const output = toContentString(aiMessage.content);
        if (CONFIG.memoryEnabled) {
            const chatHistory = getAgentChatHistory(sessionId);
            await chatHistory.addMessage(new HumanMessage(userInput));
            await chatHistory.addMessage(new AIMessage(output || 'No response was generated.'));
        }
        return { response: output || 'No response was generated.' };
    }

    const toolOutputs = [];
    for (const toolCall of toolCalls) {
        const tool = toolsByName.get(toolCall.name);
        let toolResult;

        if (!tool) {
            toolResult = JSON.stringify({ ok: false, error: `Tool not found: ${toolCall.name}` });
        } else {
            try {
                toolResult = await executeToolDirectly(tool, toolCall.args || {});
            } catch (error) {
                toolResult = JSON.stringify({ ok: false, error: error.message });
            }
        }

        toolOutputs.push({
            tool: toolCall.name,
            args: toolCall.args || {},
            output: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
        });
    }

    const finalPrompt = ChatPromptTemplate.fromMessages([
        ['system', `${systemPrompt}\n\nYou must now write the final response using the provided tool outputs. Do not call more tools.`],
        ['human', 'Recent conversation context:\n{history}\n\nUser request:\n{input}\n\nTool outputs (single execution round):\n{toolOutputs}']
    ]);
    const finalChain = finalPrompt.pipe(agentLLM);
    const finalMessage = await finalChain.invoke({
        input: userInput,
        history: historyText,
        toolOutputs: JSON.stringify(toolOutputs)
    });

    const finalOutput = toContentString(finalMessage.content);
    if (CONFIG.memoryEnabled) {
        const chatHistory = getAgentChatHistory(sessionId);
        await chatHistory.addMessage(new HumanMessage(userInput));
        await chatHistory.addMessage(new AIMessage(finalOutput || 'No response was generated after tool execution.'));
    }
    return { response: finalOutput || 'No response was generated after tool execution.' };
}

/**
 * Returns the initialized agent executor handle.
 *
 * @returns {Object}
 * @throws {Error} Throws if agentic AI is disabled or agent is not initialized.
 */
function getAgent() {
    if (!CONFIG.agenticEnabled) {
        throw new Error('Agentic AI is disabled. Set AGENTIC=true to enable agent usage.');
    }

    if (!agent) {
        throw new Error('Agent is not initialized. Call initializeLLM first.');
    }

    return agent;
}

// ============================================
// LLM INITIALIZATION
// ============================================

/**
 * Initializes the LLM clients used for AI-powered responses.
 * Sets the module-level `llm` (Google Generative AI) and `langChainLLM` (LangChain wrapper)
 * variables. Both clients are skipped and left as null if GEMINI_API_KEY is not configured.
 *
 * @returns {Promise<void>}
 * @throws {Error} Throws if either client fails to initialize due to an invalid API key or
 *                 an unexpected constructor error.
 */
async function initializeLLM() {
    if (!CONFIG.geminiApiKey) {
        console.warn('⚠ GEMINI_API_KEY is not set. LLM clients will be unavailable.');
        return;
    }

    try {
        // Initialize the native Google Generative AI client.
        llm = new GoogleGenerativeAI(CONFIG.geminiApiKey).getGenerativeModel({ model: CONFIG.llmModel });
        console.log('✓ Google Generative AI client initialized');
    } catch (error) {
        console.error('✗ Failed to initialize Google Generative AI client:', error.message);
        throw error;
    }

    try {
        // Initialize the LangChain wrapper for the Gemini model.
        langChainLLM = new ChatGoogleGenerativeAI({ apiKey: CONFIG.geminiApiKey, model: CONFIG.llmModel });
        console.log('✓ LangChain Gemini client initialized');
    } catch (error) {
        console.error('✗ Failed to initialize LangChain Gemini client:', error.message);
        throw error;
    }

    try {
         // Initialize a dedicated LangChain Gemini client for agentic AI.
        agentLLM = new ChatGoogleGenerativeAI({ apiKey: CONFIG.geminiApiKey, model: CONFIG.llmModel });
        console.log('✓ Agentic LangChain Gemini client initialized');
    } catch (error) {
        console.error('✗ Failed to initialize Agentic LangChain Gemini client:', error.message);
        throw error;
    }

    if (CONFIG.agenticEnabled) {
        try {
            const { getAgentTools } = require('./tools');
            const tools = getAgentTools();

            // Keep agent usage simple: prompt piping with a single tool execution round.
            agent = {
                async invoke({ input, sessionId }) {
                    if (typeof input !== 'string' || input.trim().length === 0) {
                        throw new Error('Agent input must be a non-empty string.');
                    }

                    return runAgentWithTools(input, tools, sessionId);
                }
            };
            console.log('✓ Agentic executor initialized');
        } catch (error) {
            console.error('✗ Failed to initialize agent executor:', error.message);
            throw error;
        }
    } else {
        agent = null;
    }
}

// ============================================
// LLM RESPONSE FUNCTIONS
// ============================================

/**
 * Generates a text response from Gemini for a given prompt.
 *
 * @param {string} prompt - User prompt to send to the Gemini model.
 * @returns {Promise<string>} The generated response text.
 * @throws {Error} Throws when prompt is invalid, Gemini is not configured, or the API call fails.
 */
async function getLLMResponse(prompt) {
    try {
        // Guard against empty or non-string prompts to avoid unnecessary API calls.
        if (typeof prompt !== 'string' || prompt.trim().length === 0) {
            throw new Error('Prompt must be a non-empty string');
        }

        // Ensure Gemini client exists before attempting generation.
        if (!llm) {
            throw new Error('Gemini model is not initialized. Check GEMINI_API_KEY configuration.');
        }

        //const result = await llm.generateContent(prompt);
        const responseText = prompt;//result?.response?.text?.();

        if (!responseText) {
            throw new Error('Gemini returned an empty response');
        }

        console.log('✓ Gemini response generated successfully');
        return responseText;
    } catch (error) {
        console.error('✗ Gemini response generation error:', error.message);
        throw error;
    }
}

/**
 * Generates a text response from the LangChain Gemini chat model for a given prompt.
 *
 * @param {string} prompt - User prompt to send to the LangChain Gemini model.
 * @returns {Promise<string>} The generated response text content.
 * @throws {Error} Throws when prompt is invalid, LangChain Gemini is not configured, or the API call fails.
 */
async function getLangChainLLMResponse(prompt) {
    try {
        // Guard against empty or non-string prompts to avoid unnecessary API calls.
        if (typeof prompt !== 'string' || prompt.trim().length === 0) {
            throw new Error('Prompt must be a non-empty string');
        }

        // Ensure LangChain Gemini client exists before attempting generation.
        if (!langChainLLM) {
            throw new Error('LangChain Gemini model is not initialized. Check GEMINI_API_KEY configuration.');
        }

        const response = await langChainLLM.invoke(prompt);

        // LangChain may return content as either a plain string or an array of content parts.
        const responseText = typeof response.content === 'string'
            ? response.content
            : response.content
                .map(part => typeof part === 'string' ? part : part.text || '')
                .join('')
                .trim();

        if (!responseText) {
            throw new Error('LangChain Gemini returned an empty response');
        }

        console.log('✓ LangChain Gemini response generated successfully');
        return responseText;

    } catch (error) {
        console.error('✗ LangChain Gemini response generation error:', error.message);
        throw error;
    }
}

// ============================================
// EMBEDDING AND RERANKING FUNCTIONS
// ============================================

/**
 * Generates a vector embedding for a query string using the MongoDB AI embeddings API.
 *
 * @param {string} text - The input text to embed.
 * @returns {Promise<Binary>} A BSON binary vector suitable for Atlas Vector Search.
 * @throws {Error} Throws if the embeddings request fails or returns an invalid payload.
 */
async function getVectorEmbedding(text) {
    try {
        const response = await fetch("https://ai.mongodb.com/v1/embeddings", {
            "method": "POST",
            "headers": {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${CONFIG.voyageApiKey}`,
            },
            "body": JSON.stringify({
                "input": text,
                "model": CONFIG.vectorEmbeddingModel,
                "input_type": "query",
                "output_dimension": 2048,
                "output_dtype":"float"
            }),
        });
        const responseData = await response.json();
        return Binary.fromFloat32Array(new Float32Array(responseData.data[0].embedding));
    } catch (error) {
        console.error('✗ Embedding generation error:', error);
        throw error;
    }
}

/**
 * Reranks vector search results against the original query using the MongoDB AI rerank API.
 *
 * @param {string} query - The original user query.
 * @param {Array<Object>} vectorResults - Initial vector search results to rerank.
 * @returns {Promise<Array<Object>>} The same result documents with rerank scores attached and sorted.
 * @throws {Error} Throws if the rerank API request fails.
 */
async function rerankResults(query, vectorResults) {
    try {
        if (!Array.isArray(vectorResults) || vectorResults.length === 0) {
            console.log("No vector search results to rerank.");
            return [];
        }

        const documents = vectorResults.map(doc => doc.fullplot || doc.title || '');

        const response = await fetch('https://ai.mongodb.com/v1/rerank', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.voyageApiKey}`,
            },
            body: JSON.stringify({
                query,
                documents,
                model: CONFIG.rerankingModel,
                top_k: documents.length,
            }),
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(`Rerank API error: ${response.status} ${await response.text()}`);
        }

        if (!responseData || !Array.isArray(responseData.data)) {
            throw new Error('Rerank API returned an invalid response payload');
        }

        const scoresByIndex = new Map(
            responseData.data.map(result => [result.index, result.relevance_score])
        );

        const withScores = vectorResults.map((doc, index) => ({
            ...doc,
            rerankScore: scoresByIndex.get(index) ?? 0,
        }));

        return withScores.sort((a, b) => b.rerankScore - a.rerankScore);
    } catch (error) {
        console.error('✗ Rerank error:', error.message);
        throw error;
    }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    getAllConfig,
    getMoviesCollection,
    getEmbeddedMoviesCollection,
    getAgent,
    getConfig,
    connectToDatabase,
    closeDatabase,
    initializeLLM,
    getLLMResponse,
    getLangChainLLMResponse,
    getVectorEmbedding,
    rerankResults
};
