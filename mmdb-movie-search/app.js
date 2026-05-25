// app.js - Application logic, search functions, and non-POST routes
require('dotenv').config();

const utils = require('./utils');

// ============================================
//             EXACT MATCH SEARCH
// ============================================

/**
 * Exact Match Search
 * Searches for exact matches in the specified field
 * @param {string} query - Search query
 * @param {string} field - Field to search (title, cast, plot)
 * @param {string} sort - Sort option (year, rating, or empty)
 * @returns {Promise<Array>} Array of matching movies
 */
async function exactMatchSearch(query, field, sort) {
    try {
        const searchQuery = { [field]: query };
        const sortQuery = { [sort]: -1 };

        let cursor;

        if (sort && sort !== '' && sort !== 'none') {
            cursor = utils.getMoviesCollection().find(searchQuery).sort(sortQuery);
        } else {
            cursor = utils.getMoviesCollection().find(searchQuery);
        }

        const results = await cursor.toArray();
        console.log(`✓ Exact match search: "${query}" in field "${field}" - Found ${results.length} results`);

        return results;
    } catch (error) {
        console.error('✗ Exact match search error:', error);
        throw error;
    }
}

// ============================================
//             FULL TEXT SEARCH
// ============================================

/**
 * Full Text Search using MongoDB Atlas Search
 * Performs text search across movie titles, plots, and full plots with scoring.
 *
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of matching movies with relevance scores
 */
async function fullTextSearch(query) {
    try {
        
        let results = [];
        const pipeline = [
            // Search Lab 1: Uncomment the following stage to add the $search stage for full text search.
            // Search Lab 7: Comment the following stage when running the compound operator version
            // {
            //     "$search": {
            //         "index": utils.getConfig("searchIndexName"),
            //         "text": {
            //             "query": query,
            //             "path": [ "title", "cast" ],
            //             // Search Lab 2: Uncomment the following line to add typo tolerance
            //             // "fuzzy": { }

            //             // Search Lab 3: Uncomment the following line to control match criteria
            //             // "matchCriteria": "all"

            //             // Search Lab 5: Uncomment the following line to boost the score by imdb.rating value
            //             // "score": { "boost": { "path": "imdb.rating", "undefined": 5 } }
            //         },

            //         // Search Lab 6: Uncomment the following line to sort by year
            //         // "sort" : { "year" : -1 }
            //     }
            // },

            // Search Lab 7: Uncomment the following stage to use compound operator with $search
            // {
            //     "$search": {
            //         "index": utils.getConfig("searchIndexName"),

            //         // Search Lab 12: Copy-paste the "compound" operator entirely - START HERE
            //         "compound": {
            //             "must": [
            //                 { "text" : {
            //                     "path" : [
            //                         "title",
            //                         "cast"
            //                         // Search Lab 10: Uncomment the following line to add fullplot to the path
            //                         // "fullplot"
            //                     ],
            //                     "query": query
            //                 } },

            //                 // Search Lab 8: Comment the following line to remove the range condition from must
            //                 { "range" : { "path": "year", "gt": 2000 } }

            //             ],

            //             // Search Lab 8: Uncomment the following lines to add the range condition to filter
            //             // "filter" : [ { "range" : { "path": "year", "gt": 2000 } } ],

            //             // Search Lab 11: Uncomment the following lines to look for synonyms in fullplot
            //             // "should" : [ { "text" : { "path" : "fullplot", "query" : query, "synonyms" : "my_synonyms" } } ]

            //         },
            //         // Search Lab 12: Copy-paste the "compound" operator entirely - END HERE

            //         // Search Lab 10: Uncomment the following line to add the highlight operator
            //         // "highlight": { "path": "fullplot" }

            //     }
            // },

            // Search Lab 4: Uncomment the following code to extract the score from the metadata
            // {
            //     "$set": {
            //         "score": { "$meta": "searchScore" },

            //         // Search Lab 10: Uncomment the following line to extract the highlights from the metadata
            //         // "highlights": { "$meta": "searchHighlights" }

            //     }
            // }

        ];
        
        if(pipeline.length > 0) {
            let cursor = utils.getMoviesCollection().aggregate(pipeline);
            results = await cursor.toArray();
        }

        console.log(`ℹ Full text search: "${query}" - Found ${results.length} results`);
        return results;
    } catch (error) {
        console.error('✗ Full text search error:', error);
        throw error;
    }
}

// ============================================
//             AUTOCOMPLETE
// ============================================

/**
 * Performs autocomplete search for movie titles using MongoDB Atlas Search.
 *
 * @param {string} query - The search query string to autocomplete
 * @returns {Promise<Array>} Array of matching movie documents with title field
 * @throws {Error} Throws an error if the autocomplete search operation fails
 *
 * @example
 * const results = await autocompleteTitle("The God");
 * // Returns: [{ _id: ..., title: "The Godfather" }, ...]
 */
async function autocompleteTitle(query) {
    try {
        
        let results = [];

        // Search Lab 9: Uncomment the following code to run autocomplete
        // let cursor = utils.getMoviesCollection().aggregate([
        //     { $search: {
        //         "index": utils.getConfig("searchIndexName"),
        //         "autocomplete": { "query": query, "path": "title" }
        //     } },
        //     { $project: { title: 1 } },
        //     { $limit: 8 }
        // ]);
        // results = await cursor.toArray();

        console.log(`ℹ Autocomplete search: "${query}" - Found ${results.length} results`);
        return results;
    } catch (error) {
        console.error('✗ Autocomplete search error:', error);
        throw error;
    }
}

// ============================================
//                   FACETS
// ============================================


/**
 * Performs faceted search to get aggregated counts by genres, ratings, and release dates.
 * Uses MongoDB Atlas Search $searchMeta to generate facets without returning documents.
 *
 * @param {string} query - The search query string
 * @returns {Promise<Array>} Array containing facet results with buckets for genres, ratings, and release dates
 *
 * @example
 * const facets = await searchFacets("action");
 * // Returns: [{ facet: { genres: { buckets: [...] }, ratings: { buckets: [...] }, release_dates: { buckets: [...] } } }]
 */
async function searchFacets(query) {
    try {
        
        // Search Lab 12: Uncomment the following code to set the value for cursor.
        // const cursor = utils.getMoviesCollection().aggregate([
        //     {
        //         "$searchMeta": {
        //             "index": utils.getConfig("searchIndexName"),
        //             "facet": {
        //                 "operator": {
        //                     // Search Lab 12: Copy-paste the "compound" operator from fullTextSearch function here
        //                     // PASTE HERE
        //                 },
        //                 "facets": {
        //                     "genres": {
        //                         "type": "string",
        //                         "path": "genres",
        //                         "numBuckets": 3
        //                     },
        //                     "ratings": {
        //                         "type": "number",
        //                         "path": "imdb.rating",
        //                         "boundaries": [0, 5, 8, 10]
        //                     },
        //                     "release_dates": {
        //                         "type": "date",
        //                         "path": "released",
        //                         "boundaries": [
        //                             new Date("2000-01-01"),
        //                             new Date("2005-01-01"),
        //                             new Date("2015-01-01"),
        //                             new Date("2020-01-01")
        //                         ],
        //                         "default": "older"
        //                     }
        //                 }
        //             }
        //         }
        //     }
        // ]);

        let results;
        try {
            results = await cursor.toArray();
        } catch (e) {
            results = [];
        }

        console.log(`ℹ Facet search: "${query}" - Found ${results.length} results`);
        return results;
    } catch (error) {
        console.error('✗ Facet search error:', error);
        throw error;
    }
}

// ============================================
//               VECTOR SEARCH
// ============================================

/**
 * Vector Search using MongoDB Atlas VectorSearch
 * Performs text search across movie titles, plots, and full plots with scoring.
 *
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of matching movies with relevance scores
 */
async function vectorSearch(query) {
    try {
        
        let results = [];

        // Vector Search Lab 1: Uncomment the following lines of code
        // Get embedding for the query using ai.mongodb.com API endpoint
        // const queryEmbedding = await utils.getVectorEmbedding(query);
        
        // // Run vector search using the $vectorSearch aggregation stage
        // let cursor = utils.getEmbeddedMoviesCollection().aggregate([
        //     {
        //         "$vectorSearch": {
        //             "index": utils.getConfig("vectorSearchIndexName"),
        //             "queryVector": queryEmbedding,
        //             "path" : utils.getConfig("embeddingFieldName"),
        //             "limit" : 50,
        //             "numCandidates": 1000,
        
        //             // Vector Search Lab 2: Uncomment the following line to add a pre-filter on year >= 2000
        //             // "filter" : { "year" : { "$gte" : 2000 } }
        //         }
        //     },
        //     {
        //         "$set": { "score" : { "$meta": "vectorSearchScore" } }
        //     }
        // ]);
        // results = await cursor.toArray();

        // Vector Search Lab 3: Uncomment the following line
        // Re-rank results
        // results = await utils.rerankResults(query, results);

        console.log(`ℹ Vector search: "${query}" - Found ${results.length} results`);
        return results;
    } catch (error) {
        console.error('✗ Vector search error:', error.message);
        throw error;
    }
}

// ============================================
//               HYBRID SEARCH
// ============================================

/**
 * Hybrid Search using RRF and RSF
 * Performs text search across movie titles, plots, and full plots with scoring.
 *
 * @param {string} query - Search query
 * @param {number} ftsWeight - Weight for full-text search
 * @param {number} vectorWeight - Weight for vector search
 * @returns {Promise<Array>} Array of matching movies with relevance scores
 */
async function hybridSearch(query, ftsWeight, vectorWeight, hybridApproach) {
    try {
        
        // Get embedding for the query using ai.mongodb.com API endpoint
        // Vector Search Lab 4: Uncomment the following line
        // const queryEmbedding = await utils.getVectorEmbedding(query);

        // const vectorSearchStage = {
        //     "$vectorSearch": {
        //         "index": utils.getConfig("vectorSearchIndexName"),
        //         "path": utils.getConfig("embeddingFieldName"),
        //         "queryVector": queryEmbedding,
        //         "numCandidates": 1000,
        //         "limit": 20
        //     }
        // };
        // const ftsSearchStage = {
        //     "$search": {
        //         "index": utils.getConfig("searchIndexName"),
        //         "text": {
        //             "query": query,
        //             "path": ["fullplot", "title", "cast"]
        //         }
        //     }
        // };

        const rrfPenalty = 60;
        let pipeline = [];

        if (hybridApproach === 'rrf' || hybridApproach === 'rsf') {
            let score;
            if (hybridApproach === 'rrf') {
                score = { "$add": ["$rrf_fts_score", "$rrf_vs_score"] };
            } else {
                score = { "$add": ["$rsf_fts_score", "$rsf_vs_score"] };
            }
            pipeline = [
                vectorSearchStage,
                { "$set": { "vectorScore": { "$meta": "vectorSearchScore" } } },
                { "$group": { "_id": null, "docs": { "$push": "$$ROOT" } } },
                { "$unwind": { "path": "$docs", "includeArrayIndex": "rank" } },
                { "$replaceRoot": { "newRoot": { "$mergeObjects": ["$docs", { "rank": { "$add": [1, "$rank"] } }] } } },
                {
                    "$addFields": {
                        "rrf_vs_score": {
                            "$divide": [vectorWeight, { "$add": ["$rank", rrfPenalty] }]
                        },
                        "rsf_vs_score": {
                            "$divide": [vectorWeight, { "$subtract": [1, "$vectorScore"] }]
                        }
                    }
                },
                {
                    "$unionWith": {
                        "coll": utils.getConfig("embeddedCollectionName"),
                        "pipeline": [
                            ftsSearchStage,
                            { "$limit": 20 },
                            { "$set": { "ftsScore": { "$meta": "searchScore" } } },
                            { "$group": { "_id": null, "docs": { "$push": "$$ROOT" } } },
                            { "$unwind": { "path": "$docs", "includeArrayIndex": "rank" } },
                            { "$replaceRoot": { "newRoot": { "$mergeObjects": ["$docs", { "rank": { "$add": [1, "$rank"] } }] } } },
                            {
                                "$addFields": {
                                    "rrf_fts_score": {
                                        "$divide": [ftsWeight, { "$add": ["$rank", rrfPenalty] }]
                                    },
                                    "rsf_fts_score": {
                                        "$let": {
                                            "vars": {
                                                "normSearchScore": {
                                                    "$divide": [1, { "$add": [1, { "$exp": { "$multiply": [-1, "$ftsScore"] } }] }]
                                                }
                                            },
                                            "in": { "$divide": [ftsWeight, { "$subtract": [1, "$$normSearchScore"] }] }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                },
                {
                    "$group": {
                        "_id": "$_id",
                        "doc": { "$first": "$$ROOT" },
                        "rrf_vs_score": { "$max": "$rrf_vs_score" },
                        "rsf_vs_score": { "$max": "$rsf_vs_score" },
                        "rrf_fts_score": { "$max": "$rrf_fts_score" },
                        "rsf_fts_score": { "$max": "$rsf_fts_score" }
                    }
                },
                {
                    "$replaceRoot": {
                        "newRoot": {
                            "$mergeObjects": [
                                "$doc",
                                {
                                    "rrf_vs_score": { "$ifNull": ["$rrf_vs_score", 0] },
                                    "rsf_vs_score": { "$ifNull": ["$rsf_vs_score", 0] },
                                    "rrf_fts_score": { "$ifNull": ["$rrf_fts_score", 0] },
                                    "rsf_fts_score": { "$ifNull": ["$rsf_fts_score", 0] }
                                }
                            ]
                        }
                    }
                },
                { "$set": { "score": score } },
                { "$sort": { "score": -1 } }
            ];
        } else if (hybridApproach === 'rankFusion') {
            pipeline = [
                {
                    "$rankFusion": {
                        "input": {
                            "pipelines": {
                                "search": [ftsSearchStage, { "$limit": 20 }],
                                "vector": [vectorSearchStage]
                            }
                        },
                        "combination": {
                            "weights": { "search": ftsWeight, "vector": vectorWeight }
                        },
                        "scoreDetails": true
                    }
                },
                { "$set": { "score": { "$meta": "scoreDetails" } } },
                { "$set": { "score": "$score.value" } }
            ];
        } else if (hybridApproach === 'scoreFusion') {
            pipeline = [
                {
                    "$scoreFusion": {
                        "input": {
                            "normalization": "sigmoid",
                            "pipelines": {
                                "search": [ftsSearchStage, { "$limit": 20 }],
                                "vector": [vectorSearchStage]
                            }
                        },
                        "combination": {
                            "method": "avg",
                            "weights": { "search": ftsWeight, "vector": vectorWeight }
                        },
                        "scoreDetails": true
                    }
                },
                { "$set": { "score": { "$meta": "scoreDetails" } } },
                { "$set": { "score": "$score.value" } }
            ];
        }

        let cursor = utils.getEmbeddedMoviesCollection().aggregate(pipeline);

        let results = await cursor.toArray();

        console.log(`ℹ Hybrid search: "${query}" - Found ${results.length} results`);
        return results;
    } catch (error) {
        console.error('✗ Hybrid search error:', error.message);
        throw error;
    }
}

// ============================================
//          AI DISCOVER AND RAG CHAT
// ============================================

/**
 * Provides user response to questions about the movies in the result set.
 *
 * @param {string} query - Search query
 * @param {Array<Object>} context - Array of movie documents to provide context for the LLM response
 * @returns {Promise<string>} LLM-generated response based on the query and context
 */
async function discoverResponse(query, context) {
    try {

        let responseText = '';
        
        const cleanedContext = context.map(({ plot_embedding, plot_embedding_voyage_3_large, _id, tomatoes, imdb, ...rest }) => ({
            ...rest,
            ...(tomatoes !== undefined && { rottenTomatoes: tomatoes }),
            ...(imdb !== undefined && { IMDB: imdb })
        }));

        const prompt = `
            You are a movie expert chatbot answering questions using ONLY the provided MongoDB documents from the sample_mflix.embedded_movies collection.

            The user query is: ${query}

            The retrieved documents are in a JSON array named "movies":
            movies = ${JSON.stringify(cleanedContext)}

            Each movie document can include fields like: title, year, genres, plot, fullplot, cast, directors, imdb.rating, tomatoes, runtime, languages, awards, etc.

            TASK:
            - Answer the user query as accurately as possible using ONLY information from the "movies" array.
            - If multiple movies are relevant, you may mention several of them, but keep the answer focused and concise.
            - If the answer is not supported by these documents, say that the information is not available in the provided movies.
            - Do NOT invent or guess facts outside what appears in the JSON.
            - Respond in 2 to 4 sentences of natural-language text only (no JSON, no bullet points).
            `;

        // RAG Lab 1: Uncomment the following line to get LLM response    
        // responseText = await utils.getLangChainLLMResponse(prompt);

        console.log('ℹ Discover response: ', responseText);
        return responseText;
    } catch (error) {
        console.error('✗ Discover response error:', error.message);
        throw error;
    }
}

/**
 * Provides user response to questions about the embedded_movies collection.
 *
 * @param {string} query - Search query
 * @param {string} aiMode - AI Chat Mode : RAG, Agentic AI
 * @param {string} [sessionId] - Client session id for short-term memory.
 * @returns {Promise<string>} LLM-generated response based on the query and mode
 */
async function aiChatResponse(query, aiMode, sessionId) {
    try {
        
        let responseText = '';

        if (aiMode === 'rag') {

            let results = [];

            // RAG Lab 2: Uncomment the following line to get embedding for the query
            // const queryEmbedding = await utils.getVectorEmbedding(query);
            
            // RAG Lab 2: Uncomment the following code to run ENN vector search for the query
            // const cursor = utils.getEmbeddedMoviesCollection().aggregate([
            //     {
            //         "$vectorSearch": {
            //             "index": utils.getConfig("vectorSearchIndexName"),
            //             "queryVector": queryEmbedding,
            //             "path": utils.getConfig("embeddingFieldName"),
            //             "limit": 10,
            //             "exact": true
            //         }
            //     },
            //     {
            //         "$addFields": {
            //             "released": { "$dateToString": { "format": "%d-%b-%Y", "date": "$released" } },
            //             "rottenTomatoes": "$tomatoes",
            //             "IMDB": "$imdb"
            //         }
            //     },
            //     {
            //         "$project": {
            //             "_id": 0,
            //             "plot_embedding": 0,
            //             "plot_embedding_voyage_3_large": 0
            //         }
            //     }
            // ]);
            // results = await cursor.toArray();

            const contextText = JSON.stringify(results);

            const prompt = `
            You are a movie expert chatbot answering questions using ONLY the provided MongoDB documents from the sample_mflix.embedded_movies collection.

            The user query is: ${query}

            The retrieved documents are in a JSON array named "movies":
            movies = ${contextText}

            Each movie document can include fields like: title, year, genres, plot, fullplot, cast, directors, imdb.rating, tomatoes, runtime, languages, awards, etc.

            TASK:
            - Answer the user query as accurately as possible using ONLY information from the "movies" array.
            - If multiple movies are relevant, you may mention several of them, but keep the answer focused and concise.
            - If the answer is not supported by these documents, say that the information is not available in the provided movies.
            - Do NOT invent or guess facts outside what appears in the JSON.
            - Respond in 2 to 4 sentences of natural-language text only (no JSON, no bullet points).
            `;

            // RAG Lab 2: Uncomment the following line to get LLM response
            // responseText = await utils.getLangChainLLMResponse(prompt);

        } else if ( aiMode === 'agentic') {

            // We have a running movie search agent initialize on server start
            // This agent is configured with 1 tool: exactMatchSearchTool, which implements exactMatchSearch()

            // Agentic AI Lab: Uncomment the following line to retrieve the agent
            // const agent = utils.getAgent();
            
            const payload = { input: query, sessionId };
            const result = typeof agent.invoke === 'function'
                ? await agent.invoke(payload)
                : await agent.call(payload);

            if (typeof result === 'string') {
                responseText = result;
            } else if (result && typeof result.response === 'string') {
                responseText = result.response;
            } else if (result && typeof result.output === 'string') {
                responseText = result.output;
            } else {
                responseText = JSON.stringify(result);
            }
        }

        console.log('ℹ AI '+aiMode+' Chat response: ', responseText);
        return responseText;
    } catch (error) {
        console.error('✗ AI '+aiMode+' Chat response error:', error.message);
        throw error;
    }
}

module.exports = {
    exactMatchSearch,
    fullTextSearch,
    autocompleteTitle,
    searchFacets,
    vectorSearch,
    hybridSearch,
    discoverResponse,
    aiChatResponse
};
