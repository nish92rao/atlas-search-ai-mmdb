const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');

const exactMatchSearchInputSchema = z.object({
	query: z.string().trim().min(1).describe('The exact value to search for, e.g. a movie title.'),
	field: z
		.enum(['title', 'genres', 'cast', 'languages', 'directors', 'writers', 'year', 'countries'])
		.default('title')
		.describe('The MongoDB field to search in.'),
	sort: z
		.enum(['none', 'year', 'imdb.rating', 'awards.wins', 'released', 'runtime', 'tomatoes.viewer.rating', 'tomatoes.critic.rating'])
		.default('none')
		.describe('Field to sort by: "none" (no sort), "year", "imdb.rating", "awards.wins", "released", "runtime", "tomatoes.viewer.rating", "tomatoes.critic.rating".')
});

/**
 * LangChain tool wrapper for app.exactMatchSearch().
 *
 * Tool input format (structured object):
 * { query: "The Matrix", field: "title", sort: "year" }
 */
const exactMatchSearchTool = new DynamicStructuredTool({
	name: 'exact_match_search',
	description: [
		'Run exact movie match search using app.exactMatchSearch(query, field, sort).',
		'Input must be a structured object with keys:',
		'query (required string), field (title|genres|cast|languages|directors|writers|year|countries), sort (none|year|imdb.rating|awards.wins|released|runtime|tomatoes.viewer.rating|tomatoes.critic.rating).',
        'If sort is not provided, pass it as "none".',
        'For example: {{ query: "The Matrix", field: "title", sort: "none" }}'
	].join(' '),
	schema: exactMatchSearchInputSchema,
	func: async ({ query, field = 'title', sort = 'none' }) => {
		try {
			const appModule = require('./app');
			// Invoke the original function from app.js using zod-validated structured input.
			const results = await appModule.exactMatchSearch(query, field, sort);

			// Cap response size so agent contexts remain manageable.
			const cappedResults = results.slice(0, 20);
			return JSON.stringify({
				ok: true,
				totalResults: results.length,
				returnedResults: cappedResults.length,
				results: cappedResults
			});
		} catch (error) {
			return JSON.stringify({
				ok: false,
				error: error.message
			});
		}
	}
});

function getAgentTools() {
	return [exactMatchSearchTool];
}

module.exports = {
	exactMatchSearchTool,
	getAgentTools
};
