import { describe, expect, it } from "vitest";
import { checkStatsRoutes, parseStatsRoutes, rendererStatsPaths } from "./stats-routes";

const SERVER = `
	if (path === "/api/status") { return Response.json(statsLive().status()); }
	if (path === "/api/stats") { return Response.json(stats); }
	if (path === "/api/stats/overview") { return Response.json(stats); }
	if (path === "/api/stats/frustration") { return Response.json(stats); }
	if (path === "/api/frustration/judge" || path === "/api/frustration/cancel") {
		if (req.method !== "POST") return Response.json({ error: "POST required" }, { status: 405 });
		if (req.headers.get(STATS_ACTION_HEADER) !== "1") { return forbidden; }
	}
	if (path === "/api/sync") {
		if (req.method !== "POST") return Response.json({ error: "POST required" }, { status: 405 });
		statsLive().requestSync();
	}
`;

const clean = {
	validPaths: ["/api/status", "/api/stats/overview", "/api/stats/frustration", "/api/sync"],
	postPaths: ["/api/sync"],
	rendererPaths: ["/api/stats/overview", "/api/sync"],
};

describe("stats route contract", () => {
	it("reads routes, POST gates, and header gates from the server source", () => {
		const table = parseStatsRoutes(SERVER);
		expect([...table.routes]).toContain("/api/frustration/cancel");
		expect([...table.postOnly].sort()).toEqual(["/api/frustration/cancel", "/api/frustration/judge", "/api/sync"]);
		expect([...table.actionHeader].sort()).toEqual(["/api/frustration/cancel", "/api/frustration/judge"]);
	});

	it("accepts a GUI that matches the server", () => {
		expect(checkStatsRoutes(parseStatsRoutes(SERVER), clean)).toEqual([]);
	});

	it("flags the three drifts that shipped in v0.9.12", () => {
		const errors = checkStatsRoutes(parseStatsRoutes(SERVER), {
			validPaths: [...clean.validPaths, "/api/stats/behavior"],
			postPaths: [],
			rendererPaths: ["/api/stats/behavior", "/api/stats/provider-windows"],
		});
		expect(errors).toEqual([
			"/api/sync: server requires POST, StatsClient sends GET",
			"/api/stats/behavior: StatsClient allows it but the stats server has no route",
			"/api/stats/provider-windows: the renderer calls it but StatsClient rejects it",
		]);
	});

	it("refuses to pass when the parser stops recognizing the server", () => {
		expect(checkStatsRoutes(parseStatsRoutes("switch (path) {}"), clean)).toHaveLength(1);
	});

	it("collects only double-quoted literal paths from renderer code", () => {
		// biome-ignore lint/suspicious/noTemplateCurlyInString: the fixture is source text containing a template literal
		const source = 'useStats("/api/stats/costs", p); fetch(`/api/request/${id}`); runStatsSync("/api/sync")';
		expect(rendererStatsPaths(source)).toEqual(["/api/stats/costs", "/api/sync"]);
	});
});
