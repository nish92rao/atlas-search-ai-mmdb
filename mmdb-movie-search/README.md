# MongoDB Movie Database (MMDB) - Atlas Search Labs

A hands-on lab environment for **MCP510 - MongoDB Atlas Search** course. This modern web application demonstrates how to build powerful search capabilities using MongoDB Atlas Search with the sample_mflix database.

## About the Lab

In this lab series, you will progressively enhance the MMDB application with MongoDB Atlas Search features:

1. **Full-text Search** - Search across multiple fields with relevance scoring
2. **Fuzzy Search** - Handle typos and spelling variations
3. **Match Criteria** - Control whether all or any search terms must match
4. **Scoring & Sorting** - Customize relevance ranking and sort order
5. **Compound Queries** - Combine multiple search conditions with filters
6. **Autocomplete** - Provide real-time search suggestions
7. **Highlighting** - Show matched text in search results
8. **Synonyms** - Expand search to include related terms
9. **Faceting** - Generate aggregated counts for filtering

The application consists of:
- **Backend** (`server.js`) - Node.js/Express server with MongoDB Atlas Search aggregations
- **Frontend** (`index.html`) - Interactive UI with search, autocomplete, and results display
- **Configuration** (`.env`) - MongoDB connection and search index settings

---

## Prerequisites

Before starting the labs, ensure you have completed the following setup:

### 1. MongoDB Atlas Cluster & Data

- ✅ **Atlas Cluster Running** - Have an active MongoDB Atlas cluster (free tier M0 works fine)
- ✅ **Sample Dataset Loaded** - Load the `sample_mflix` dataset (especially the `movies` collection)
  - In Atlas UI: Clusters → ••• menu → Load Sample Dataset
- ✅ **Database User Configured** - Create a database user with the role atlasAdmin@admin
  - In Atlas UI: Security → Database & Network Access → Create User (Built-in Roles → Atlas Admin)
- ✅ **Network Access Configured** - Add your IP address to the IP Access List
  - In Atlas UI: Security → Database & Network Access → IP Access List → Add IP Address
- ✅ **Connection String** - Copy the connection string to an accessible place, like a Notepad window
  - In Atlas UI: Clusters → Connect → Compass → Copy the connection string
  - Paste it in a Notepad window, then update the database username and password.

### 2. Local Development Tools

- ✅ **Node.js & npm** - Install Node.js v16 or higher
  - Download from: https://nodejs.org/
  - Verify installation:
    ```bash
    node --version
    npm --version
    ```

### 3. Get the MMDB Codebase

Clone or download the `mmdb-movie-search` repository to your local machine:

```bash
git clone https://github.com/nish92rao/mcp510-atlas-search-labs.git
cd mmdb-movie-search/mmdb-movie-search
```

### 4. Configure Environment Variables

Update the following configurations in the .env file:

```env
# MongoDB Atlas Connection String
MONGODB_URI=<connection-string-from-Atlas>

# Atlas Search Index Name
SEARCH_INDEX_NAME=movie-search
```

**Replace `<connection-string-from-Atlas>` with your actual connection string from the Notepad.**

### 5. Install Dependencies

From the project directory, install all required npm packages:

```bash
npm install
```

### 6. Start the Application

Run the application in development mode:

```bash
npm run dev
```

You should see output similar to:
```
✓ Connected to MongoDB Atlas
✓ Database: sample_mflix
✓ Collection: movies

╔════════════════════════════════════════╗
║  MongoDB Movie Database API Started    ║
╚════════════════════════════════════════╝

Server running at http://localhost:3000
```

### 7. Open the Application UI

Open `index.html` in your web browser. The application interface should load with:
- Search input box
- "Full Text Search" and "Exact Match" radio buttons
- View toggle buttons (List/Tile view)

---

## Lab 0: Baseline "Exact Match" Search

**Objective:** Understand basic MongoDB query behavior before implementing Atlas Search.

### Exercise

1. In the UI, select the **"Exact Match"** option
2. Type `mission` in the search bar and click Search
3. Observe the results
4. Now type `Mission: Impossible` and search again
5. Compare the differences in results

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
   - Choose **"Atlas Search"**
   - Choose **"Visual Editor"**
   - Keep the default index name (e.g., `default`)
   - Select Database: `sample_mflix`
   - Select Collection: `movies`
5. Click **"Create Search Index"**
6. Wait for the index status to become **"Ready"** (this may take a minute)

### Testing the Index

1. Once ready, click **"Query"** to open the Search Tester
2. Try different searches:
   - `Tom Cruise`
   - `tom cruise` (lowercase)
   - `tam cruise` (typo)
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
2. Configure the index:
   - Index Name: `movie-search`
   - Database: `sample_mflix`
   - Collection: `movies`
3. Click **"Refine Your Index"**
4. **Disable Dynamic Mapping** (toggle off)
5. Add the following field mappings using **"Add Field Mapping → Customized Configuration"**:
   - **Field:** `title` | **Data Type:** String
   - **Field:** `cast` | **Data Type:** String
   - **Field:** `imdb.rating` | **Data Type:** Number
6. Click **"Save Changes"** and wait for the index to be **Ready**
7. Compare the index size to the earlier `default` index

### Index Configuration (as seen in JSON Editor)

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": {
        "type": "string"
      },
      "cast": {
        "type": "string"
      },
      "imdb": {
        "type": "document",
        "fields": {
          "rating": {
            "type": "number"
          }
        }
      }
    }
  }
}
```

### Benefits of Static Mapping

- Smaller index size
- Faster queries
- Explicit control over searchable fields
- Better performance in production

---

## Lab 2: Full-Text Search Implementation

**Objective:** Connect the MMDB app to Atlas Search with a basic `$search` stage.

### Exercise

1. Open `server.js` in your code editor
2. Locate the `fullTextSearch` function (around line 97)
3. Inside the aggregation pipeline, add a `$search` stage as the **first stage**
4. Configure the `$search` stage to:
   - Use `CONFIG.searchIndexName` as the index
   - Use the `text` operator
   - Search across `title` and `cast` fields
   - Use the user's `query` parameter

**💡 See [Lab 2 Solution](#lab-2-solution-full-text-search-implementation) for the complete code.**

### Testing

1. Save the file (the app will auto-reload with nodemon)
2. Refresh the browser
3. Select **"Full Text Search"** option
4. Try these searches:
   - `mission`
   - `mission impossible`
   - `tom cruise`
   - Any movie-related terms

### Observations

- Case-insensitive search
- Finds results across both title and cast fields
- Results are automatically ranked by relevance

---

## Lab 3: Fuzzy Search & Match Criteria

### Lab 3.1: Implement Fuzzy Search (Typo Tolerance)

**Objective:** Enable the search to handle typos and spelling variations.

### Exercise

1. In `server.js`, inside the `text` operator of the `$search` stage
2. After the `path` option, add a `fuzzy` option:

```javascript
fuzzy: {}
```

3. Test with intentional typos (up to 2 characters):
   - `missn impoible` (should find "Mission Impossible")
4. Experiment with stricter matching:

```javascript
fuzzy: { maxEdits: 1 }
```

5. Re-test with the same typos and observe the difference. Then try with only 1 character typo:
   - `missin imposible` (should find "Mission Impossible")

**💡 See [Lab 3.1 Solution](#lab-31-solution-fuzzy-search) for the complete code.**

### Fuzzy Options Explained

| Option | Description | Default |
|--------|-------------|---------|
| `maxEdits` | Allowed edit distance per term (1 or 2) | 2 |
| `prefixLength` | Number of initial characters that must match exactly | 0 |
| `maxExpansions` | Maximum number of generated variations | 50 |

---

### Lab 3.2: Experiment with Match Criteria

**Objective:** Control whether ALL or ANY search terms must match.

### Exercise

1. In the same `text` operator, add the `matchCriteria` option:

```javascript
matchCriteria: "any"
```

2. Search for `Mission Impossible`
3. Observe results that may contain only "Mission" OR only "Impossible"
   - Example: "The Impossible", "The Mission"
4. Change to:

```javascript
matchCriteria: "all"
```

5. Re-search and verify that results now contain BOTH "Mission" AND "Impossible"

**💡 See [Lab 3.2 Solution](#lab-32-solution-match-criteria) for the complete code.**

### Match Criteria Options

- **`"any"`** - Matches documents containing ANY of the search terms (OR logic)
- **`"all"`** - Matches documents containing ALL search terms (AND logic)

---

## Lab 4: Scoring & Sorting

### Lab 4.1: Expose Search Score in Results

**Objective:** Make relevance scores visible for analysis and customization.

### Exercise

1. In `server.js`, locate the `fullTextSearch` aggregation pipeline
2. **After** the `$search` stage, add a `$set` stage to project the search score:

```javascript
{
    $set: {
        score: { $meta: "searchScore" }
    }
}
```

3. Save and test a search in the UI
4. Inspect the browser's Network tab or server logs to see score values

**💡 See [Lab 4.1 Solution](#lab-41-solution-expose-search-score) for the complete code.**

---

### Lab 4.2: Boost Scores Using IMDb Rating

**Objective:** Influence relevance ranking using document field values.

### Exercise - Part 1: Add Year Field to Index

1. In Atlas, edit the `movie-search` index
2. Add field mapping:
   - **Field:** `year`
   - **Data Type:** Number
3. Save and wait for rebuild

### Exercise - Part 2: Implement Score Boosting

1. In `server.js`, inside the `text` operator, add a `score` option:

**Option A: Constant Score (Uniform Relevance)**

```javascript
score: {
    constant: {
        value: 5
    }
}
```

**Option B: Boost by Factor**

```javascript
score: {
    boost: {
        value: 5
    }
}
```

**Option C: Boost by Field Value (IMDb Rating)**

```javascript
score: {
    boost: {
        path: "imdb.rating",
        undefined: 5  // Default score if field is missing
    }
}
```

2. Run a search after implementing each option, and observe how the scoring and sorting of the results changes.

**💡 See [Lab 4.2 Solution](#lab-42-solution-score-boosting) for all three scoring options.**

---

### Lab 4.3: Sort by Year Instead of Relevance

**Objective:** Override relevance-based sorting with field-based sorting.

### Exercise

1. In the Atlas web console, edit the `movie-search` index with Visual Editor. Add a new field mapping for `year` field with data type as `Number`. Save the changes and wait for the index to be **Ready**.

2. In the `$search` stage, add a `sort` option (as a sibling to the `text` operator):

```javascript
sort: { year: -1 }
```

3. Run a search and verify results are sorted by most recent year first

**💡 See [Lab 4.3 Solution](#lab-43-solution-sort-by-year) for the complete code.**

---

## Lab 5: Compound Queries

### Lab 5.1: Filter by Year Using `must`

**Objective:** Combine text search with range filters using compound queries.

### Exercise

1. In `server.js`, replace the simple `text` operator with a `compound` operator
2. Inside `compound`, create a `must` array containing:
   - A `text` clause for title and cast
   - A `range` clause requiring `year > 2000`

**💡 See [Lab 5.1 Solution](#lab-51-solution-compound-with-must) for the complete code.**

### Testing

Run a search and confirm:
- All results have `year > 2000`
- Both the text match AND year filter influence the score

---

### Lab 5.2: Move Year Filter to `filter` (Score-Neutral)

**Objective:** Apply filters without affecting relevance scores.

### Exercise

1. Modify the `compound` operator
2. Move the `range` clause from `must` to a new `filter` array
3. Keep the `text` clause in `must`

**💡 See [Lab 5.2 Solution](#lab-52-solution-compound-with-filter) for the complete code.**

### Observations

- Documents still satisfy `year > 2000`
- **Scores are now based only on text relevance**
- The year filter no longer affects ranking

### Compound Query Clauses

| Clause | Behavior | Affects Score |
|--------|----------|---------------|
| `must` | Document MUST match all clauses | ✅ Yes |
| `mustNot` | Document MUST NOT match any clause | ❌ No |
| `should` | Document SHOULD match (boosts score if it does) | ✅ Yes |
| `filter` | Document MUST match but doesn't affect score | ❌ No |

---

## Lab 6: Autocomplete

### Lab 6.1: Add Autocomplete Mapping for `title`

**Objective:** Configure the index to support autocomplete queries.

### Exercise

1. In Atlas, edit the `movie-search` index using Visual Editor
2. Click **"Add Field Mapping → Customized Configuration"**
3. Configure:
   - **Field:** `title`
   - **Data Type:** `autocomplete`
   - Observe the values for `minGram` (default 2), `maxGram` (default 15), and `tokenization` (default edgeGram). Leave them with their default values.
4. Save and wait for the index to be **Ready**

---

### Lab 6.2: Implement `autocompleteTitle` in server.js

**Objective:** Enable real-time search suggestions as users type.

### Exercise

1. In `server.js`, locate the `autocompleteTitle` function
2. **Uncomment** the cursor initialization code
3. Implement the aggregation pipeline with:
   - `$search` stage using the `autocomplete` operator
   - `$project` to return only the `title` field
   - `$limit` to restrict suggestions (e.g., 8)

**💡 See [Lab 6.2 Solution](#lab-62-solution-autocomplete-implementation) for the complete code.**

---

### Lab 6.3: Enable Suggestions in the UI

**Objective:** Wire up the autocomplete dropdown in the frontend.

### Exercise

1. Open `index.html` in your editor
2. Find line 30 (or search for `suggestionsList`)
3. **Uncomment** the following line:

```html
<div id="suggestionsList" class="suggestions-list"></div>
```

4. Save and refresh the browser
5. Type at least **2 characters** in the search box
6. Verify that a suggestion dropdown appears and updates as you type

### Optional Enhancement

**Question:** How would you add typo tolerance to autocomplete suggestions?

**Answer:** Add the `fuzzy` option to the `autocomplete` operator:

```javascript
autocomplete: {
    query: query,
    path: "title",
    fuzzy: {
        maxEdits: 1
    }
}
```

---

## Lab 7: Highlighting

### Lab 7.1: Configure `fullplot` for Highlighting

**Objective:** Enable Atlas Search to store and highlight matched text.

### Exercise

1. In Atlas, edit the `movie-search` index
2. Note the current index size (for comparison)
3. Add field mapping for `fullplot`:
   - **Field:** `fullplot`
   - **Data Type:** String
   - **analyzer:** `lucene.english`
   - **store:** `true` ← This is critical for highlighting
4. Save and wait for rebuild
5. Compare the new index size

### Optional Size Optimization

For other string mappings, set **store: false** to reduce index size.

---

### Lab 7.2: Implement Highlighting in fullTextSearch

**Objective:** Return highlighted snippets showing where matches occur.

### Exercise

1. In `server.js`, update the `text` operator's `path` array to include `"fullplot"`:

```javascript
path: ["title", "cast", "fullplot"]
```

2. **After** the compound operator, add the `highlight` option:

```javascript
highlight: {
    path: "fullplot"
}
```

3. In the `$set` stage, also create a new field called `highlights` as follows:

```javascript
{
    $set: {
        score: { $meta: "searchScore" },
        highlights: { $meta: "searchHighlights" }
    }
}
```

4. Test by searching for `mission`, then click on a movie to open the detail modal
5. Verify that matching text in the plot is highlighted

**💡 See [Lab 7.2 Solution](#lab-72-solution-highlighting-implementation) for the complete code.**

### Example Highlight Output - as returned by the query API

```json
{
  ... ,
  "title": "The Mission",
  "fullplot": "Jeremy Irons plays a Spanish Jesuit who goes into the South American wilderness to build a mission...",
  ... ,
  "highlights": [
    {
      "score": 1.1023898124694824,
      "path": "fullplot",
      "texts": [
        { "value": "...wilderness to build a ", "type": "text" },
        { "value": "mission", "type": "hit" },
        { "value": " in the hope of...", "type": "text" }
      ]
    },
    ...
  ]
}
```

---

## Lab 8: Synonyms

### Lab 8.1: Configure Synonyms in Atlas

**Objective:** Enable search to match related terms (e.g., "car" matches "vehicle").

### Exercise

1. In Atlas, edit the `movie-search` index
2. Scroll to the **"Synonyms Mapping"** section
3. Click **"Add Synonym Mapping"**
4. Configure:
   - **Name:** `my_synonyms`
   - **Synonym Source:** Click **"Load Sample Collection"**
   - **Analyzer:** `lucene.english`
5. Save and wait for index to be **Ready**
6. In Atlas, browse collections to confirm the synonyms source collection appears

### What Atlas Does

Atlas creates a collection with synonym mappings as follows:
```json
[
  { "mappingType": "equivalent", "synonyms": ["car", "vehicle", "automobile"] },
  { "mappingType": "explicit", "synonyms": ["beer", "brew", "pint"], "input": "beer" }
]
```

---

### Lab 8.2: Use Synonyms in fullTextSearch

**Objective:** Boost results that match synonyms of the search terms.

### Exercise

1. In `server.js`, inside the `compound` operator, add a `should` clause
2. The `should` clause should contain a `text` operator on `fullplot` that uses the synonym mapping:

```javascript
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

3. Test by searching for `car`
4. Open results like:
   - "Revenge of the Electric Car"
   - "Who Killed the Electric Car?"
5. Observe that synonyms like "vehicle" may be highlighted

**💡 See [Lab 8.2 Solution](#lab-82-solution-synonyms-in-search) for the complete code.**

### How Synonyms Work

- Documents matching exact terms get base score
- Documents matching synonyms get **bonus score** (via `should`)
- Results are re-ranked based on combined scores

---

## Lab 9: Faceting

### Lab 9.1: Add Facet-Ready Mappings

**Objective:** Configure fields for faceted aggregation.

### Exercise

1. In Atlas, edit the `movie-search` index.
2. Add field mappings:
   - **Field:** `genres` | **Data Type:** `token`
   - **Field:** `released` | **Data Type:** `date`
3. Save and wait for the Search Index to be **Ready**.

---

### Lab 9.2: Implement Faceted Search with `$searchMeta`

**Objective:** Generate aggregated counts for genres, ratings, and release dates.

### Exercise

1. In `server.js`, locate the `searchFacets` function
2. **Uncomment** the cursor initialization code
3. The pipeline should use `$searchMeta` (not `$search`)
4. Configure:
   - **operator:** Copy the entire `compound` block from `fullTextSearch`
   - **facets:** Define facets for `genres`, `imdb.rating`, and `released`

**💡 See [Lab 9.2 Solution](#lab-92-solution-faceted-search-implementation) for the complete code.**

### Testing

1. Save and refresh the UI
2. Run a full-text search
3. The facets section should appear showing:
   - Top genres with counts
   - Rating distribution
   - Release date buckets

### Example Facet Output - as returned by the query API

```json
{
  "count": { "lowerBound": 7 },
  "facet": {
    "genres": {
      "buckets": [
        { "_id": "Drama", "count": 4 },
        { "_id": "Documentary", "count": 2 },
        { "_id": "Action", "count": 1 }
      ]
    },
    "ratings": {
      "buckets": [
        { "_id": 0, "count": 1 },
        { "_id": 5, "count": 6 },
        { "_id": 8, "count": 0 },
        { "_id": 10, "count": 0 }
      ]
    },
    "release_dates": {
      "buckets": [
        { "_id": "2000-01-01T00:00:00.000Z", "count": 2 },
        { "_id": "2005-01-01T00:00:00.000Z", "count": 4 },
        { "_id": "2015-01-01T00:00:00.000Z", "count": 1 },
        { "_id": "2020-01-01T00:00:00.000Z", "count": 0 },
        { "_id": "older", "count": 0 }
      ]
    }
  }
}
```

### Facet Types

| Type | Use Case | Options |
|------|----------|---------|
| `string` | Categorical values | `numBuckets` - max number of categories |
| `number` | Numeric ranges | `boundaries` - array of range boundaries |
| `date` | Date ranges | `boundaries` - array of Date objects |

---

## Summary

Congratulations! You've completed all MongoDB Atlas Search labs. You now know how to:

✅ Create and configure Atlas Search indexes  
✅ Implement full-text search with relevance scoring  
✅ Handle typos with fuzzy search  
✅ Build compound queries with filters  
✅ Customize ranking with score modifications  
✅ Provide autocomplete suggestions  
✅ Highlight matched text in results  
✅ Expand searches with synonyms  
✅ Generate faceted aggregations  

## Next Steps and Resources

- **Explore** advanced topics within Atlas Search
   - additional operators like `phrase`, `wildcard`, and `regex`
   - [query, filter and retrieve arrays of objects](https://www.mongodb.com/docs/atlas/atlas-search/return-scope/)
   - [paginate the results](https://www.mongodb.com/docs/atlas/atlas-search/paginate-results/)
   - [complex query capability for advanced users](https://www.mongodb.com/docs/atlas/atlas-search/operators-collectors/queryString/)
   - [use views with Atlas Search](https://www.mongodb.com/docs/atlas/atlas-search/view-support/)
   - [parallelize query execution across segments](https://www.mongodb.com/docs/atlas/atlas-search/concurrent-query/)
   - [return stored source fields](https://www.mongodb.com/docs/atlas/atlas-search/return-stored-source/)
   - [hybrid search](https://www.mongodb.com/docs/atlas/atlas-search/tutorial/hybrid-search/), i.e. combining full-text search and vector search for more relevant results
- **Review** the [MongoDB Atlas Search Documentation](https://www.mongodb.com/docs/atlas/atlas-search/)
- **Achieve** the MongoDB Skill Badge on [Search Fundamentals](https://learn.mongodb.com/courses/search-fundamentals)

---

## Solutions

This section contains complete code solutions for all labs. Reference these if you need help implementing any exercise.

<details>
    <summary>Click to see</summary>

### Lab 2 Solution: Full-Text Search Implementation

<details>
    <summary>Click to see</summary>

```javascript
async function fullTextSearch(query) {
    try {
        let cursor = moviesCollection.aggregate([
            // Add this $search stage
            {
                $search: {
                    index: CONFIG.searchIndexName,
                    text: {
                        query: query,
                        path: ["title", "cast"]
                    }
                }
            }
        ]);

        const results = await cursor.toArray();
        console.log(`✓ Full text search: "${query}" - Found ${results.length} results`);
        return results;
    } catch (error) {
        console.error('✗ Full text search error:', error);
        throw error;
    }
}
```
</details>

---

### Lab 3.1 Solution: Fuzzy Search

<details>
    <summary>Click to see</summary>

```javascript
{
    $search: {
        index: CONFIG.searchIndexName,
        text: {
            query: query,
            path: ["title", "cast"],
            fuzzy: {
                maxEdits: 2,        // Can be 2 or 1; Allows up to 2 character edits per term
                prefixLength: 0,    // No required exact prefix
                maxExpansions: 50   // Maximum variations to search
            }
        }
    }
}
```
</details>

---

### Lab 3.2 Solution: Match Criteria

<details>
    <summary>Click to see</summary>

```javascript
{
    $search: {
        index: CONFIG.searchIndexName,
        text: {
            query: query,
            path: ["title", "cast"],
            fuzzy: {
                maxEdits: 2
            },
            matchCriteria: "any"  // or "all"
        }
    }
}
```
</details>

---

### Lab 4.1 Solution: Expose Search Score

<details>
    <summary>Click to see</summary>

```javascript
let cursor = moviesCollection.aggregate([
    {
        $search: {
            index: CONFIG.searchIndexName,
            text: {
                query: query,
                path: ["title", "cast"],
                fuzzy: { maxEdits: 2 }
            }
        }
    },
    {
        $set: {
            score: { $meta: "searchScore" }
        }
    }
]);
```
</details>

---

### Lab 4.2 Solution: Score Boosting

<details>
    <summary>Click to see</summary>

**Option A: Constant Score**

<details>
    <summary>Click to see</summary>

```javascript
{
    $search: {
        index: CONFIG.searchIndexName,
        text: {
            query: query,
            path: ["title", "cast"],
            score: {
                constant: {
                    value: 5
                }
            }
        }
    }
}
```
</details>

**Option B: Boost by Factor**

<details>
    <summary>Click to see</summary>

```javascript
{
    $search: {
        index: CONFIG.searchIndexName,
        text: {
            query: query,
            path: ["title", "cast"],
            score: {
                boost: {
                    value: 5
                }
            }
        }
    }
}
```
</details>

**Option C: Boost by Field Value (IMDb Rating)**

<details>
    <summary>Click to see</summary>

```javascript
{
    $search: {
        index: CONFIG.searchIndexName,
        text: {
            query: query,
            path: ["title", "cast"],
            score: {
                boost: {
                    path: "imdb.rating",
                    undefined: 5
                }
            }
        }
    }
}
```
</details>
</details>

---

### Lab 4.3 Solution: Sort by Year

<details>
    <summary>Click to see</summary>

```javascript
{
    $search: {
        index: CONFIG.searchIndexName,
        text: {
            query: query,
            path: ["title", "cast"]
        },
        sort: {
            year: -1  // -1 for descending, 1 for ascending
        }
    }
}
```
</details>

---

### Lab 5.1 Solution: Compound with Must

<details>
    <summary>Click to see</summary>

```javascript
{
    $search: {
        index: CONFIG.searchIndexName,
        compound: {
            must: [
                {
                    text: {
                        path: ["title", "cast"],
                        query: query
                    }
                },
                {
                    range: {
                        path: "year",
                        gt: 2000
                    }
                }
            ]
        }
    }
}
```
</details>

---

### Lab 5.2 Solution: Compound with Filter

<details>
    <summary>Click to see</summary>

```javascript
{
    $search: {
        index: CONFIG.searchIndexName,
        compound: {
            must: [
                {
                    text: {
                        path: ["title", "cast"],
                        query: query
                    }
                }
            ],
            filter: [
                {
                    range: {
                        path: "year",
                        gt: 2000
                    }
                }
            ]
        }
    }
}
```
</details>

---

### Lab 6.2 Solution: Autocomplete Implementation

<details>
    <summary>Click to see</summary>

```javascript
async function autocompleteTitle(query) {
    try {
        let cursor = moviesCollection.aggregate([
            {
                $search: {
                    index: CONFIG.searchIndexName,
                    autocomplete: {
                        query: query,
                        path: "title"
                    }
                }
            },
            {
                $project: {
                    title: 1
                }
            },
            {
                $limit: 8
            }
        ]);

        const results = await cursor.toArray();
        console.log(`ℹ Autocomplete search: "${query}" - Found ${results.length} results`);
        return results;
    } catch (error) {
        console.error('✗ Autocomplete search error:', error);
        throw error;
    }
}
```

**Optional: Adding Typo Tolerance to Autocomplete**

```javascript
autocomplete: {
    query: query,
    path: "title",
    fuzzy: {
        maxEdits: 1
    }
}
```
</details>

---

### Lab 7.2 Solution: Highlighting Implementation

<details>
    <summary>Click to see</summary>

```javascript
{
    $search: {
        index: CONFIG.searchIndexName,
        compound: {
            must: [
                {
                    text: {
                        path: ["title", "cast", "fullplot"],
                        query: query
                    }
                }
            ],
            filter: [
               {
                  range: {
                     path: "year",
                     gt: 2000
                  }
               }
            ]
        },
        highlight: {
            path: "fullplot"
        }
    }
},
{
    $set: {
        score: { $meta: "searchScore" },
        highlights: { $meta: "searchHighlights" }
    }
}
```
</details>

---

### Lab 8.2 Solution: Synonyms in Search

<details>
    <summary>Click to see</summary>

```javascript
{
    $search: {
        index: CONFIG.searchIndexName,
        compound: {
            must: [
                {
                    text: {
                        path: ["title", "cast", "fullplot"],
                        query: query
                    }
                }
            ],
            filter: [
               {
                  range: {
                     path: "year",
                     gt: 2000
                  }
               }
            ],
            should: [
                {
                    text: {
                        path: "fullplot",
                        query: query,
                        synonyms: "my_synonyms"
                    }
                }
            ]
        },
        highlight: {
            path: "fullplot"
        }
    }
}
```
</details>

---

### Lab 9.2 Solution: Faceted Search Implementation

<details>
    <summary>Click to see</summary>

```javascript
async function searchFacets(query) {
    try {
        const cursor = moviesCollection.aggregate([
            {
                $searchMeta: {
                    index: CONFIG.searchIndexName,
                    facet: {
                        operator: {
                            // Copy compound operator from fullTextSearch
                            compound: {
                                 must: [
                                    {
                                       text: {
                                             path: ["title", "cast", "fullplot"],
                                             query: query
                                       }
                                    }
                                 ],
                                 filter: [
                                    {
                                       range: {
                                          path: "year",
                                          gt: 2000
                                       }
                                    }
                                 ],
                                 should: [
                                    {
                                       text: {
                                             path: "fullplot",
                                             query: query,
                                             synonyms: "my_synonyms"
                                       }
                                    }
                                 ]
                              }
                        },
                        facets: {
                            genres: {
                                type: "string",
                                path: "genres",
                                numBuckets: 10
                            },
                            ratings: {
                                type: "number",
                                path: "imdb.rating",
                                boundaries: [0, 5, 8, 10],
                                default: "other"
                            },
                            release_dates: {
                                type: "date",
                                path: "released",
                                boundaries: [
                                    new Date("2000-01-01"),
                                    new Date("2005-01-01"),
                                    new Date("2015-01-01"),
                                    new Date("2020-01-01")
                                ],
                                default: "older"
                            }
                        }
                    }
                }
            }
        ]);
        
        let results;
        try {
            results = await cursor.toArray();
        } catch(e) {
            results = [];
        }
        
        console.log(`ℹ Facet search: "${query}" - Found ${results.length} results`);
        return results;
    } catch (error) {
        console.error('✗ Facet search error:', error);
        throw error;
    }
}
```
</details>

</details>

---

## Troubleshooting

### Server Won't Start

- Check that `MONGODB_URI` in `.env` is correct
- Verify network access in Atlas (IP allowlist)
- Ensure `sample_mflix` database is loaded

### No Search Results

- Verify `SEARCH_INDEX_NAME=movie-search` in `.env`
- Check that the `movie-search` index status is "Ready" in Atlas
- Ensure field mappings include the fields you're searching

### Autocomplete Not Working

- Verify `title` field has `autocomplete` type in index
- Check that `suggestionsList` div is uncommented in `index.html`
- Ensure typing at least 2 characters

### Highlighting Not Showing

- Verify `fullplot` field has `store: true` in index mapping
- Check that `highlight` option is in `$search` stage
- Ensure `highlights` is projected with `$meta: "searchHighlights"`

---

**Happy Searching! 🎬🔍**

