/**
 * Route/method half of the stats contract (the payload half is type-checked in
 * `stats-contract.ts`). Types cannot see HTTP routes, so this reads the route
 * table out of `packages/stats/src/server.ts` and checks every path the GUI
 * calls exists there and goes out with the method the server demands.
 */

export interface StatsRouteTable {
	routes: Set<string>;
	postOnly: Set<string>;
	/** Routes that also demand the `X-Omp-Stats-Action` header, which StatsClient never sends. */
	actionHeader: Set<string>;
}

const ROUTE_CONDITION = /if \((path === "\/api\/[^"]+"(?: \|\| path === "\/api\/[^"]+")*)\)/g;

export function parseStatsRoutes(serverSource: string): StatsRouteTable {
	const table: StatsRouteTable = { routes: new Set(), postOnly: new Set(), actionHeader: new Set() };
	const matches = [...serverSource.matchAll(ROUTE_CONDITION)];
	for (const [index, match] of matches.entries()) {
		const paths = [...match[1].matchAll(/"(\/api\/[^"]+)"/g)].map(([, route]) => route);
		const body = serverSource.slice(match.index, matches[index + 1]?.index ?? serverSource.length);
		for (const route of paths) {
			table.routes.add(route);
			if (body.includes('req.method !== "POST"')) table.postOnly.add(route);
			if (body.includes("STATS_ACTION_HEADER")) table.actionHeader.add(route);
		}
	}
	return table;
}

/** GUI-side facts: StatsClient's allowlists and every literal `/api/...` path the renderer uses. */
export interface GuiStatsUsage {
	validPaths: readonly string[];
	postPaths: readonly string[];
	rendererPaths: readonly string[];
}

export function checkStatsRoutes(table: StatsRouteTable, gui: GuiStatsUsage): string[] {
	if (table.routes.size < 5) {
		return ["parsed fewer than 5 routes from packages/stats/src/server.ts — update parseStatsRoutes"];
	}
	const errors: string[] = [];
	const valid = new Set(gui.validPaths);
	const post = new Set(gui.postPaths);
	for (const route of valid) {
		if (!table.routes.has(route)) errors.push(`${route}: StatsClient allows it but the stats server has no route`);
		if (table.actionHeader.has(route))
			errors.push(`${route}: server requires X-Omp-Stats-Action, StatsClient never sends it`);
		if (table.postOnly.has(route) && !post.has(route))
			errors.push(`${route}: server requires POST, StatsClient sends GET`);
		if (!table.postOnly.has(route) && post.has(route))
			errors.push(`${route}: StatsClient sends POST, server does not gate it on POST`);
	}
	for (const route of post) {
		if (!valid.has(route)) errors.push(`${route}: in POST_PATHS but not VALID_PATHS`);
	}
	for (const route of gui.rendererPaths) {
		if (!valid.has(route)) errors.push(`${route}: the renderer calls it but StatsClient rejects it`);
	}
	return errors;
}

/** Double-quoted `/api/...` literals; template-built paths (`/api/request/${id}`) are matched by StatsClient's pattern instead. */
export function rendererStatsPaths(source: string): string[] {
	return [...source.matchAll(/"(\/api\/[a-z/-]+)"/g)].map(([, route]) => route);
}
