# MongoDB Movie Database (MMDB) — Atlas Search & AI Labs

A hands-on lab environment for the **MongoDB Certification Program (MCP) — Atlas Platform Capabilities (APC)** two-day training.

- **Day 1 — APC100: Atlas Search** — Labs 0 through 9
- **Day 2 — APC200: Vector Search & AI Integrations** — Labs 10 through 17

The MMDB application is a Node.js/Express backend paired with a browser-based frontend, running against the `sample_mflix` dataset on MongoDB Atlas. Labs are implemented by editing `app.js` and `.env` — each exercise has clearly marked comment blocks (`Lab 1`, `Lab 2`, etc.) that you uncomment in sequence.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Day 1 — Atlas Search](#day-1--atlas-search)
  - [Lab 0: Baseline Exact Match Search](#lab-0-baseline-exact-match-search)
  - [Lab 1: Creating Atlas Search Indexes](#lab-1-creating-atlas-search-indexes)
  - [Lab 2: Full-Text Search Implementation](#lab-2-full-text-search-implementation)
  - [Lab 3: Fuzzy Search & Match Criteria](#lab-3-fuzzy-search--match-criteria)
  - [Lab 4: Scoring & Sorting](#lab-4-scoring--sorting)
  - [Lab 5: Compound Queries](#lab-5-compound-queries)
  - [Lab 6: Autocomplete](#lab-6-autocomplete)
  - [Lab 7: Highlighting](#lab-7-highlighting)
  - [Lab 8: Synonyms](#lab-8-synonyms)
  - [Lab 9: Faceting](#lab-9-faceting)
- [Day 2 — Vector Search & AI Integrations](#day-2--vector-search--ai-integrations)
  - [Day 2 Prerequisites](#day-2-prerequisites)
  - [Lab 10: Vector Search Index & Basic Query](#lab-10-vector-search-index--basic-query)
  - [Lab 11: Pre-filters on Vector Search](#lab-11-pre-filters-on-vector-search)
  - [Lab 12: Reranking with Voyage AI](#lab-12-reranking-with-voyage-ai)
  - [Lab 13: Hybrid Search](#lab-13-hybrid-search)
  - [Lab 14: RAG — Chat with Search Results](#lab-14-rag--chat-with-search-results)
  - [Lab 15: RAG — AI Movie Chatbot](#lab-15-rag--ai-movie-chatbot)
  - [Lab 16: Agentic AI](#lab-16-agentic-ai)
  - [Lab 17: Short-term Memory with MongoDB](#lab-17-short-term-memory-with-mongodb)
- [Troubleshooting](#troubleshooting)
- [Solutions](#solutions)

---

## Prerequisites

Complete the following setup **before Day 1** begins.

### 1. MongoDB Atlas Cluster & Data

- ✅ **Atlas Cluster Running** — Have an active MongoDB Atlas cluster (free tier M0 works fine)
- ✅ **Sample Dataset Loaded** — Load the `sample_mflix` dataset (especially the `movies` and `embedded_movies` collections)
  - In Atlas UI: Clusters → ••• menu → Load Sample Dataset
- ✅ **Database User Configured** — Create a database user with the role `atlasAdmin@admin`
  - In Atlas UI: Security → Database & Network Access → Create User (Built-in Roles → Atlas Admin)
- ✅ **Network Access Configured** — Add your IP address to the IP Access List
  - In Atlas UI: Security → Database & Network Access → IP Access List → Add IP Address
- ✅ **Connection String** — Copy the connection string to an accessible place
  - In Atlas UI: Clusters → Connect → Compass → Copy the connection string
  - Paste it in a text editor and update the database username and password

### 2. Local Development Tools

- ✅ **Node.js & npm** — Install Node.js v16 or higher
  - Download from: https://nodejs.org/
  - Verify installation:

```
node --version
npm --version
```

### 3. Get the MMDB Codebase

Clone the repository to your local machine:

```
git clone https://github.com/nish92rao/atlas-search-ai-mmdb.git
cd atlas-search-ai-mmdb/mmdb-movie-search
```

### 4. Configure Environment Variables

Update the following in the `.env` file:

```
# MongoDB Atlas Connection String
MONGODB_URI=<connection-string-from-Atlas>

# Atlas Search Index Name (Day 1)
SEARCH_INDEX_NAME=movie-search
```

Replace `<connection-string-from-Atlas>` with your actual connection string.

### 5. Install Dependencies

```
npm install
```

### 6. Start the Application

```
npm run dev
```

You should see:

```
✓ Connected to MongoDB Atlas
✓ Database: sample_mflix

╔════════════════════════════════════════╗
║  MongoDB Movie Database API Started    ║
╚════════════════════════════════════════╝

Server running at http://localhost:3000
```

### 7. Open the Application UI

Open `index.html` in your web browser. You should see a search input box with **"Full Text Search"** and **"Exact Match"** options.

---

## Day 1 — Atlas Search

---

## Lab 0: Baseline "Exact Match" Search

**Objective:** Understand basic MongoDB query behavior before implementing Atlas Search.

### Exercise

1. In the UI, select the **"Exact Match"** option
2. Type `mission` in the search bar and click Search — observe the results
3. Now type `Mission: Impossible` and search again
4. Compare the difference in results

### Discussion

**Exact Match Behavior:**
- Case-sensitive matching
- Requires exact string match
- Limited flexibility with user input

---

## Lab 1: Creating Atlas Search Indexes

### Lab 1.1: Create a Default Atlas Search Index

**Objective:** Explore the Atlas Search UI and understand dynamic mapping.

### Exercise

1. In the Atlas UI, navigate to your cluster
2. Click **"Search & Vector Search"** in the left sidebar
3. Click **"Create Search Index"**
4. In the wizard:
   - Choose **"Atlas Search"** and **"Visual Editor"**
   - Keep the default index name (e.g., `default`)
   - Select Database: `sample_mflix`, Collection: `movies`
5. Click **"Create Search Index"** and wait for status to be **"Ready"**

### Testing the Index

1. Once ready, click **"Query"** to open the Search Tester
2. Try different searches: `Tom Cruise`, `tom cruise`, `tam cruise` (typo)
3. Click **"Edit Query"** to see the generated `$search` stage
4. Click **"Index Overview"** to inspect the index configuration

### Observations

- Dynamic mapping automatically indexes all fields
- Case-insensitive search works by default
- Minor typos may still find results

---

### Lab 1.2: Create the `movie-search` Index with Static Mapping

**Objective:** Create a production-ready index with explicit field mappings for better control and performance.

### Exercise

1. In Atlas UI, go to **"Search & Vector Search"** → **"Create Search Index"**
2. Set index name `movie-search`, Database: `sample_mflix`, Collection: `movies`
3. Click **"Refine Your Index"**
4. **Disable Dynamic Mapping** (toggle off)
5. Add the following field mappings via **"Add Field Mapping → Customized Configuration"**:
   - `title` — String
   - `cast` — String
   - `imdb.rating` — Number
6. Save and wait for the index to be **"Ready"**
7. Compare the size of this index to the earlier `default` index

### Index Configuration (JSON Editor view)

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": { "type": "string" },
      "cast": { "type": "string" },
      "imdb": {
        "type": "document",
        "fields": {
          "rating": { "type": "number" }
        }
      }
    }
  }
}
```

---

## Lab 2: Full-Text Search Implementation

**Objective:** Connect the MMDB app to Atlas Search with a basic `$search` stage.

### Exercise

1. Open `app.js` and locate the `fullTextSearch` function
2. In the aggregation pipeline, **uncomment Lab 1** — the `$search` stage using the `text` operator searching across `title` and `cast`
3. Save the file (nodemon will auto-restart the server)

### Testing

1. Refresh the browser and select **"Full Text Search"**
2. Try: `mission`, `mission impossible`, `tom cruise`

### Observations

- Case-insensitive search
- Finds results across both title and cast fields
- Results are automatically ranked by relevance

---

## Lab 3: Fuzzy Search & Match Criteria

### Lab 3.1: Implement Fuzzy Search (Typo Tolerance)

**Objective:** Enable the search to handle typos and spelling variations.

### Exercise

1. In `app.js`, inside the `fullTextSearch` function's `$search` stage, **uncomment Lab 2** to add `"fuzzy": {}`
2. Test with intentional typos (up to 2 characters): `missn impoible`
3. Next, update the fuzzy option to `"fuzzy": { "maxEdits": 1 }` and re-test
4. Try a 1-character typo: `missin imposible`

### Fuzzy Options Explained

| Option           | Description                                             | Default |
|------------------|---------------------------------------------------------|---------|
| `maxEdits`       | Allowed edit distance per term (1 or 2)                 | 2       |
| `prefixLength`   | Number of initial characters that must match exactly    | 0       |
| `maxExpansions`  | Maximum number of generated variations to search for    | 50      |

---

### Lab 3.2: Experiment with Match Criteria

**Objective:** Control whether ALL or ANY search terms must match.

### Exercise

1. In `app.js`, **uncomment Lab 3** to set `matchCriteria: "all"`
2. Search for `Mission Impossible`
3. Notice that results now contain BOTH "Mission" AND "Impossible" (compare to default `"any"` behavior, which also returns "The Impossible" or "The Mission")

### Match Criteria Options

- **`"any"`** — Matches documents containing ANY of the search terms (OR logic)
- **`"all"`** — Matches documents containing ALL search terms (AND logic)

---

## Lab 4: Scoring & Sorting

### Lab 4.1: Expose Search Score in Results

**Objective:** Make relevance scores visible for analysis and customization.

### Prerequisite

First, add a `year` field mapping to the `movie-search` index:

1. In Atlas, edit the `movie-search` index
2. Add Field Mapping → `year` — Number
3. Save and wait for the index to be **"Ready"**

### Exercise

1. In `app.js` `fullTextSearch`, **uncomment Lab 4** to add a `$set` stage projecting `searchScore`:

```js
{ $set: { score: { $meta: "searchScore" } } }
```

2. Run a search in the UI and observe the scores

---

### Lab 4.2: Boost Scores

**Objective:** Influence relevance ranking using document field values.

### Exercise

1. In `app.js`, **uncomment Lab 5** to add a `score` option to the `text` operator
2. Try these three options one at a time and observe how the results change:

**Option A: Boost by IMDb Rating**
```js
score: { boost: { path: "imdb.rating", undefined: 5 } }
```

**Option B: Boost by a Constant Factor**
```js
score: { boost: { value: 5 } }
```

**Option C: Set a Constant Score (all matching docs score the same)**
```js
score: { constant: { value: 5 } }
```

---

### Lab 4.3: Sort by Year Instead of Relevance

**Objective:** Override relevance-based sorting with field-based sorting.

### Exercise

1. In `app.js`, **uncomment Lab 6** to add a `sort` option to the `$search` stage:

```js
sort: { year: -1 }
```

2. Run a search and confirm results are sorted from most recent to oldest

---

## Lab 5: Compound Queries

### Lab 5.1: Filter by Year Using `must`

**Objective:** Combine text search with a range filter so both conditions influence the score.

### Exercise

1. In `app.js`, **comment out the Lab 1 `$search` stage** and **uncomment Lab 7** (the second `$search` stage using `compound`)
2. The compound operator places the `text` and `range` conditions in a `must` array
3. Run a search and confirm all results have `year > 2000`; note the scores of the top results

---

### Lab 5.2: Move Year Filter to `filter` (Score-Neutral)

**Objective:** Apply filters without affecting relevance scores.

### Exercise

1. In `app.js`, inside the `compound` operator, **comment the Lab 8 `range` line in `must`** and **uncomment the Lab 8 `filter` line**
2. Run the same search and compare scores — year no longer contributes to ranking

### Compound Query Clauses

| Clause      | Behavior                                           | Affects Score |
|-------------|----------------------------------------------------|---------------|
| `must`      | Document MUST match — required and scored          | ✅ Yes         |
| `mustNot`   | Document MUST NOT match — excluded from results    | ❌ No          |
| `should`    | Boosts score if matched, not required              | ✅ Yes         |
| `filter`    | Document MUST match, but doesn't affect score      | ❌ No          |

---

## Lab 6: Autocomplete

### Lab 6.1: Add Autocomplete Mapping for `title`

**Objective:** Configure the index to support autocomplete queries.

### Exercise

1. In Atlas, edit the `movie-search` index
2. Add Field Mapping → Customized Configuration:
   - **Field:** `title`, **Data Type:** `autocomplete`
   - Leave `minGram` (default 2), `maxGram` (default 15), and `tokenization` (default edgeGram) at their defaults
3. Save and wait for the index to be **"Ready"**

---

### Lab 6.2: Implement Autocomplete in the App

**Objective:** Enable real-time search suggestions as users type.

### Exercise

1. In `.env`, set `AUTOCOMPLETE=true`
2. In `app.js`, locate `autocompleteTitle` and **uncomment Lab 9** to add the `$search` stage using the `autocomplete` operator
3. Save, refresh the browser, and start typing in the search box
4. After at least 2 characters, a suggestion dropdown should appear

**Optional — add typo tolerance:**
```js
autocomplete: { query: query, path: "title", fuzzy: { maxEdits: 1 } }
```

---

## Lab 7: Highlighting

### Lab 7.1: Configure `fullplot` for Highlighting

**Objective:** Enable Atlas Search to store and highlight matched text.

### Exercise

1. In Atlas, edit the `movie-search` index — note the current size
2. Add Field Mapping:
   - **Field:** `fullplot`, **Data Type:** String, **Analyzer:** `lucene.english`, **store:** `true`
3. Save, wait for rebuild, and compare the new index size
4. Optionally set `store: false` on other string fields to reduce size

---

### Lab 7.2: Implement Highlighting in the App

**Objective:** Return highlighted snippets showing where matches occur in the plot.

### Exercise

1. In `app.js`, inside the `text` operator, **uncomment Lab 10** to add `fullplot` to the `path` array
2. After `compound`, uncomment the `highlight` option: `"highlight": { "path": "fullplot" }`
3. In the `$set` stage, uncomment Lab 10 to add `highlights: { $meta: "searchHighlights" }`
4. Search for `mission`, click a movie, and verify the matched text is highlighted in the plot

---

## Lab 8: Synonyms

### Lab 8.1: Configure Synonyms in Atlas

**Objective:** Enable search to match related terms (e.g., "car" also matches "vehicle").

### Exercise

1. In Atlas, edit the `movie-search` index
2. In the **"Synonyms Mapping"** section, click **"Add Synonym Mapping"**:
   - **Name:** `my_synonyms`
   - **Synonym Source Collection:** click **"Load Sample Collection"**
   - **Analyzer:** `lucene.english`
3. Save and wait for the index to be **"Ready"**
4. Refresh the collections list — a sample synonyms collection now exists in `sample_mflix`

The collection contains documents in two formats:

```json
{ "mappingType": "equivalent", "synonyms": ["car", "vehicle", "automobile"] }
{ "mappingType": "explicit", "input": ["beer"], "synonyms": ["beer", "brew", "pint"] }
```

---

### Lab 8.2: Use Synonyms in fullTextSearch

**Objective:** Boost results that match synonyms of the search terms.

### Exercise

1. In `app.js`, inside the `compound` operator, **uncomment Lab 11** to add a `should` clause that searches `fullplot` with `synonyms: "my_synonyms"`
2. Search for `car`, open a result like "Revenge of the Electric Car"
3. Observe that the synonym "vehicle" is highlighted in the plot

---

## Lab 9: Faceting

### Lab 9.1: Add Facet-Ready Mappings

**Objective:** Configure fields for faceted aggregation.

### Exercise

1. In Atlas, edit the `movie-search` index and add:
   - `genres` — Token
   - `released` — Date
2. Save and wait for **"Ready"**

---

### Lab 9.2: Implement Faceted Search with `$searchMeta`

**Objective:** Generate aggregated counts for genres, ratings, and release dates.

### Exercise

1. In `.env`, set `FACETS=true`
2. In `app.js`, locate `searchFacets` and **uncomment the Lab 12 lines** for the `$searchMeta` pipeline
3. Inside the `"operator"` object, copy-paste the entire `"compound"` block from `fullTextSearch`
4. Save, refresh the browser, run a search, and observe the facet counts that appear

### Example Facet Output

```json
{
  "count": { "lowerBound": 7 },
  "facet": {
    "genres": { "buckets": [{ "_id": "Drama", "count": 4 }, { "_id": "Documentary", "count": 2 }] },
    "ratings": { "buckets": [{ "_id": 0, "count": 1 }, { "_id": 5, "count": 6 }] },
    "release_dates": { "buckets": [{ "_id": "2000-01-01T00:00:00.000Z", "count": 2 }] }
  }
}
```

### Facet Types

| Type     | Use Case            | Key Option                                 |
|----------|---------------------|--------------------------------------------|
| `string` | Categorical values  | `numBuckets` — max number of categories    |
| `number` | Numeric ranges      | `boundaries` — array of range boundaries   |
| `date`   | Date ranges         | `boundaries` — array of Date objects       |

---

## Day 2 — Vector Search & AI Integrations

---

## Day 2 Prerequisites

Complete these steps **before Day 2** begins.

### Get a Voyage AI API Key

1. In the Atlas UI, go to **Services → AI Models** in the left panel
2. Click **"Create model API Key"**, give it a name, and proceed
3. Copy the key somewhere safe — you will need it for all vector search labs

> **Note:** This key works with the `ai.mongodb.com` API endpoint used by the MMDB app.

### Get a Gemini API Key

1. Log in to your Google account and go to [aistudio.google.com](https://aistudio.google.com)
2. Click **"Get API Key"** → **"Create API Key"**
3. Copy the key somewhere safe — you will need it for the RAG and Agentic AI labs

The app uses the `gemini-3.1-flash-lite-preview` model, which has a generous free tier (15 requests/min, 500 requests/day).

---

## Lab 10: Vector Search Index & Basic Query

**Objective:** Create a Vector Search index and run your first semantic search.

### Lab 10.1: Create the `movie-vector-search` Index

1. In the Atlas UI, go to **"Search & Vector Search"** → **"Create Search Index"**
2. Select **"Vector Search"** and **"Visual Editor"**
3. Set:
   - **Name:** `movie-vector-search`
   - **Database:** `sample_mflix`, **Collection:** `embedded_movies`
4. On the next page, remove the mapping for `plot_embedding`; keep only `plot_embedding_voyage_3_large`
5. Set **Similarity:** `Dot Product`
6. Build the index and verify the definition shows `numDimensions: 2048`

> **About `embedded_movies`:** This is a smaller collection (3,483 docs) pre-loaded with vector embeddings for the `plot` field, generated using the `voyage-3-large` model at 2048 dimensions.

---

### Lab 10.2: Implement Vector Search in the App

1. In `.env`, set:

```
VECTOR=true
VECTOR_SEARCH_INDEX_NAME=movie-vector-search
VOYAGE_API_KEY=<your-model-api-key>
VECTOR_EMBEDDING_MODEL=voyage-3-large
```

2. In `app.js`, locate `vectorSearch()` and **uncomment the Vector Search Lab 1 lines**:
   - `queryEmbedding` variable (calls `getVectorEmbedding()` to embed the query with Voyage AI)
   - The aggregation pipeline using `$vectorSearch`

3. Refresh the browser, select **"Vector Search"**, and run a search — e.g., `tom cruise spy movie`

### Discussion

The query is converted into a 2048-dimension vector and compared against all stored `plot_embedding_voyage_3_large` vectors using Dot Product similarity. Results are semantically relevant even if none of the exact words appear in the plot.

> **Question:** Why are there exactly 50 results? (Hint: look at the `limit` value in the `$vectorSearch` stage.)

---

## Lab 11: Pre-filters on Vector Search

**Objective:** Narrow vector search results to a subset of documents before similarity scoring.

### Lab 11.1: Add a Filter Field to the Index

1. In the Atlas UI, edit the `movie-vector-search` index
2. Add a **Filter Field:** `year`
3. Save and wait for the index to rebuild

---

### Lab 11.2: Apply the Pre-filter in the App

1. In `app.js` `vectorSearch()`, **uncomment the Vector Search Lab 2 line** to add a `filter` on `year >= 2000`
2. Run the same search — you should still see 50 results, but movies from before 2000 are now excluded

### Vector Search Query Options Reference

| Option            | Description                                                   | Required     |
|-------------------|---------------------------------------------------------------|--------------|
| `index`           | Name of the Vector Search index                               | ✅ Yes        |
| `path`            | Field containing the vector embeddings                        | ✅ Yes        |
| `queryVector`     | The embedded query as an array of floats                      | ✅ Yes        |
| `limit`           | Number of documents to return                                 | ✅ Yes        |
| `numCandidates`   | Nearest neighbors to evaluate (ANN only; recommend: 20×limit)| For ANN      |
| `exact`           | `true` for Exact Nearest Neighbor (ENN); `false` for ANN      | No           |
| `filter`          | Pre-filter as an MQL expression                               | No           |

---

## Lab 12: Reranking with Voyage AI

**Objective:** Improve the ordering of vector search results using a cross-encoder reranking model.

### Exercise

1. In `.env`, set `RERANKING_MODEL=rerank-2.5`
2. In `app.js` `vectorSearch()`, **uncomment the Vector Search Lab 3 line**:

```js
results = await utils.rerankResults(query, results);
```

3. Run `tom cruise spy movie` again and compare the result order to the previous lab
4. Observe that Tom Cruise films now appear more prominently at the top

### How Reranking Works

Vector search is a fast "librarian" — it retrieves broadly relevant documents. A reranker is the "expert" that reads those results and re-orders them by true relevance to the query. The `rerank-2.5` model scores each (query, document) pair independently, yielding higher precision than vector similarity alone.

---

## Lab 13: Hybrid Search

**Objective:** Combine full-text search (keyword precision) with vector search (semantic understanding) for the highest overall relevance.

### Exercise

1. In `app.js`, locate `hybridSearch()` and **uncomment the Lab 4 lines** to initialize both the `$vectorSearch` and `$search` (Atlas Search) stages
2. Review the full pipeline — it uses `$rankFusion` or `$scoreFusion` to merge the two result sets, with configurable `ftsWeight` and `vectorWeight`
3. On the browser, select the **"Hybrid Search"** option
4. Use the slider to adjust FTS vs. Vector weights (they must sum to 1)
5. Switch between **RRF** (Reciprocal Rank Fusion) and **RSF** (Relative Score Fusion) and compare results

### Hybrid Search Fusion Approaches

| Approach | Description |
|----------|-------------|
| **RRF** (Reciprocal Rank Fusion) | Combines results using weighted reciprocal ranks; a penalty (60) dampens low-ranked results |
| **RSF** (Relative Score Fusion) | Combines using a weighted sum of normalized scores |

---

## Lab 14: RAG — Chat with Search Results

**Objective:** Use an LLM to answer questions about the movies currently displayed in your search results.

### Exercise

1. In `.env`, set:

```
RAG=true
GEMINI_API_KEY=<your Gemini API key>
LLM_MODEL=gemini-3.1-flash-lite-preview
```

2. In `app.js`, locate `discoverResponse()` and **uncomment the RAG Lab 1 line** to set `responseText` (the LLM call that uses your search results as context)
3. Refresh the browser and run any search (e.g., `Ranveer Singh`)
4. Click **"Discover Results"** and ask the chatbot a question about the results

### How It Works (RAG Components)

1. **Retrieval** — The movies from your current search are the context documents
2. **Augmentation** — The user's question is combined with the movie data into a single prompt
3. **Generation** — Gemini reads the prompt and responds based only on the provided movie data, reducing hallucinations

---

## Lab 15: RAG — AI Movie Chatbot

**Objective:** Build a full RAG pipeline where the user's chat query drives a vector search to retrieve relevant movies, which are then passed as context to the LLM.

### Exercise

1. In `app.js`, locate `aiChatResponse()` and find the `if (aiMode === 'rag')` block
2. **Uncomment the RAG Lab 2 lines**:
   - Get the query embedding
   - Run the `$vectorSearch` aggregation pipeline (using ENN for precision)
   - Set the LLM response to `responseText`
3. Refresh the browser, select **"AI Mode"**, and ask a question like: `Recommend me a feel-good movie set in space`

---

## Lab 16: Agentic AI

**Objective:** Give the app an AI Agent that can reason through a question and use tools to fetch the right data.

### Exercise

1. In `.env`, set `AGENTIC=true`
2. In `app.js` `aiChatResponse()`, find the `else if (aiMode === 'agentic')` block
3. **Uncomment the Agentic AI Lab line** to initialize the agent
4. Refresh the browser, select **"AI Mode"**, set Mode to **"Agentic AI"**, and ask it a question — e.g., `What are the top-rated comedies from the 1990s?`

### What's Different from RAG?

| Feature | RAG | Agentic AI |
|---------|-----|------------|
| Retrieval method | Fixed vector search | Agent decides which tool to call |
| Multi-step reasoning | ❌ No | ✅ Yes |
| Self-revision | ❌ No | ✅ Yes |
| Tool use | ❌ No | ✅ Yes |

---

## Lab 17: Short-term Memory with MongoDB

**Objective:** Persist conversation history across chat turns so the agent can refer back to what was said earlier.

### Exercise

1. In `.env`, set:

```
MEMORY=true
MEMORY_COLLECTION_NAME=agentic_memory
```

2. Refresh the browser (still in Agentic AI mode) and ask the agent a question
3. After it responds, ask: `What did I just ask you about?`
4. The agent should recall your previous question using its stored memory
5. In Atlas, browse the `agentic_memory` collection to inspect the stored message history

### How It Works

The app uses `MongoDBChatMessageHistory` (from `langchain/mongodb`) to write each message turn to a MongoDB collection, keyed by a session ID. On each new message, the full conversation history is retrieved from the collection and included in the LLM's context window, enabling true multi-turn dialogue.

---

## Troubleshooting

### Server Won't Start

- Check that `MONGODB_URI` in `.env` is correct
- Verify your IP is in the Atlas Network Access list
- Ensure the `sample_mflix` dataset is loaded

### No Search Results (Day 1)

- Confirm `SEARCH_INDEX_NAME=movie-search` in `.env`
- Check that the `movie-search` index status is **"Ready"** in Atlas
- Ensure field mappings include the fields being searched

### Autocomplete Not Working

- Verify `title` has an `autocomplete` data type in the index
- Confirm `AUTOCOMPLETE=true` in `.env`
- Type at least **2 characters** before expecting suggestions

### Highlighting Not Showing

- Verify `fullplot` field has `store: true` in the index mapping
- Check that the `highlight` option is present in the `$search` stage
- Ensure `highlights` is included using `$meta: "searchHighlights"` in the `$set` stage

### No Vector Search Results (Day 2)

- Confirm `VECTOR=true` and `VECTOR_SEARCH_INDEX_NAME=movie-vector-search` in `.env`
- Check that `VOYAGE_API_KEY` is set and valid
- Verify the `movie-vector-search` index status is **"Ready"** on the `embedded_movies` collection
- Confirm `VECTOR_EMBEDDING_MODEL=voyage-3-large` matches the model used to generate stored embeddings

### RAG / Agentic AI Not Responding

- Confirm `RAG=true` (or `AGENTIC=true`) in `.env`
- Verify `GEMINI_API_KEY` is set and valid
- Check `LLM_MODEL=gemini-3.1-flash-lite-preview`
- Note the free-tier rate limit: 15 requests/min, 500 requests/day

---

## Solutions

Reference solutions for all labs. Look here only if you're stuck — attempting the exercises first is strongly recommended.

<details>
<summary><strong>Lab 2 Solution: Full-Text Search</strong></summary>

```js
// In app.js — fullTextSearch() — uncomment Lab 1
{
    $search: {
        index: utils.getConfig("searchIndexName"),
        text: {
            query: query,
            path: ["title", "cast"]
        }
    }
}
```
</details>

<details>
<summary><strong>Lab 3.1 Solution: Fuzzy Search</strong></summary>

```js
// Add fuzzy option to text operator — uncomment Lab 2
text: {
    query: query,
    path: ["title", "cast"],
    fuzzy: { maxEdits: 2, prefixLength: 0, maxExpansions: 50 }
}
```
</details>

<details>
<summary><strong>Lab 3.2 Solution: Match Criteria</strong></summary>

```js
// Add matchCriteria to text operator — uncomment Lab 3
text: {
    query: query,
    path: ["title", "cast"],
    fuzzy: { maxEdits: 1 },
    matchCriteria: "all"
}
```
</details>

<details>
<summary><strong>Lab 4.1 Solution: Expose Search Score</strong></summary>

```js
// Add $set stage after $search — uncomment Lab 4
{ $set: { score: { $meta: "searchScore" } } }
```
</details>

<details>
<summary><strong>Lab 4.2 Solution: Score Boosting (Option C — Boost by IMDb Rating)</strong></summary>

```js
// Inside text operator — uncomment Lab 5
score: { boost: { path: "imdb.rating", undefined: 5 } }
```
</details>

<details>
<summary><strong>Lab 4.3 Solution: Sort by Year</strong></summary>

```js
// Add sort option to $search stage — uncomment Lab 6
{
    $search: {
        index: utils.getConfig("searchIndexName"),
        text: { query: query, path: ["title", "cast"] },
        sort: { year: -1 }
    }
}
```
</details>

<details>
<summary><strong>Lab 5.1 Solution: Compound with Must</strong></summary>

```js
// Second $search stage — uncomment Lab 7
{
    $search: {
        index: utils.getConfig("searchIndexName"),
        compound: {
            must: [
                { text: { path: ["title", "cast"], query: query } },
                { range: { path: "year", gt: 2000 } }
            ]
        }
    }
}
```
</details>

<details>
<summary><strong>Lab 5.2 Solution: Compound with Filter</strong></summary>

```js
// Move range to filter — uncomment Lab 8 filter line, comment Lab 8 must line
{
    $search: {
        index: utils.getConfig("searchIndexName"),
        compound: {
            must: [
                { text: { path: ["title", "cast"], query: query } }
            ],
            filter: [
                { range: { path: "year", gt: 2000 } }
            ]
        }
    }
}
```
</details>

<details>
<summary><strong>Lab 6.2 Solution: Autocomplete</strong></summary>

```js
// In autocompleteTitle() — uncomment Lab 9
let cursor = utils.getMoviesCollection().aggregate([
    {
        $search: {
            index: utils.getConfig("searchIndexName"),
            autocomplete: { query: query, path: "title" }
        }
    },
    { $project: { title: 1 } },
    { $limit: 8 }
]);
results = await cursor.toArray();
```
</details>

<details>
<summary><strong>Lab 7.2 Solution: Highlighting</strong></summary>

```js
// In fullTextSearch() — uncomment Lab 10
// Add fullplot to text path:
path: ["title", "cast", "fullplot"]

// Add highlight option after compound:
highlight: { path: "fullplot" }

// Update $set stage:
{ $set: { score: { $meta: "searchScore" }, highlights: { $meta: "searchHighlights" } } }
```
</details>

<details>
<summary><strong>Lab 8.2 Solution: Synonyms</strong></summary>

```js
// Add should clause to compound — uncomment Lab 11
should: [
    {
        text: {
            path: "fullplot",
            query: query,
            synonyms: "my_synonyms"
        }
    }
]
```
</details>

<details>
<summary><strong>Lab 9.2 Solution: Faceted Search</strong></summary>

```js
// In searchFacets() — uncomment Lab 12
{
    $searchMeta: {
        index: utils.getConfig("searchIndexName"),
        facet: {
            operator: {
                compound: {
                    must: [{ text: { path: ["title", "cast", "fullplot"], query: query } }],
                    filter: [{ range: { path: "year", gt: 2000 } }],
                    should: [{ text: { path: "fullplot", query: query, synonyms: "my_synonyms" } }]
                }
            },
            facets: {
                genres: { type: "string", path: "genres", numBuckets: 10 },
                ratings: { type: "number", path: "imdb.rating", boundaries: [0, 5, 8, 10], default: "other" },
                release_dates: {
                    type: "date",
                    path: "released",
                    boundaries: [new Date("2000-01-01"), new Date("2005-01-01"), new Date("2015-01-01"), new Date("2020-01-01")],
                    default: "older"
                }
            }
        }
    }
}
```
</details>

<details>
<summary><strong>Lab 10.2 Solution: Basic Vector Search</strong></summary>

```js
// In vectorSearch() — uncomment Vector Search Lab 1
const queryEmbedding = await utils.getVectorEmbedding(query);

let cursor = utils.getEmbeddedMoviesCollection().aggregate([
    {
        $vectorSearch: {
            index: utils.getConfig("vectorSearchIndexName"),
            path: "plot_embedding_voyage_3_large",
            queryVector: queryEmbedding,
            numCandidates: 1000,
            limit: 50
        }
    },
    { $set: { score: { $meta: "vectorSearchScore" } } }
]);
results = await cursor.toArray();
```
</details>

<details>
<summary><strong>Lab 11.2 Solution: Pre-filter on Year</strong></summary>

```js
// Add filter to $vectorSearch — uncomment Vector Search Lab 2
filter: { year: { $gte: 2000 } }
```
</details>

<details>
<summary><strong>Lab 12 Solution: Reranking</strong></summary>

```js
// In vectorSearch(), after aggregation — uncomment Vector Search Lab 3
results = await utils.rerankResults(query, results);
```
</details>

<details>
<summary><strong>Lab 13 Solution: Hybrid Search</strong></summary>

```js
// In hybridSearch() — uncomment Lab 4 lines for $vectorSearch and $search stages
// The pipeline uses $rankFusion or $scoreFusion with ftsWeight and vectorWeight
// See the full hybridSearch() function for the complete pipeline
```
</details>

<details>
<summary><strong>Lab 14 Solution: RAG — Chat with Results</strong></summary>

```js
// In discoverResponse() — uncomment RAG Lab 1
// responseText is set by calling the Gemini API with the movie results as context
```
</details>

<details>
<summary><strong>Lab 15 Solution: RAG — AI Movie Chatbot</strong></summary>

```js
// In aiChatResponse(), inside if (aiMode === 'rag') — uncomment RAG Lab 2 lines:
// 1. Get query embedding
// 2. Run $vectorSearch aggregation pipeline
// 3. Set responseText from LLM
```
</details>

<details>
<summary><strong>Lab 16 Solution: Agentic AI</strong></summary>

```js
// In aiChatResponse(), inside else if (aiMode === 'agentic') — uncomment Agentic AI Lab line
// Initializes the LangChain agent with the exact-match movie tool
```
</details>

<details>
<summary><strong>Lab 17 Solution: Short-term Memory</strong></summary>

```
# In .env — enable memory
MEMORY=true
MEMORY_COLLECTION_NAME=agentic_memory
```

```js
// MongoDBChatMessageHistory is already wired into the agent
// Once MEMORY=true, each message turn is written to and read from the agentic_memory collection
```
</details>

---

**Happy Searching! 🎬🔍**