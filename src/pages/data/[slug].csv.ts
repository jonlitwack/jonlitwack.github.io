// Serves a dataset's CSV so readers can take the numbers behind a chart.
import type { APIRoute } from "astro";
import { getEmDashEntry } from "emdash";

export const GET: APIRoute = async ({ params }) => {
	const { entry } = await getEmDashEntry("datasets", params.slug ?? "");
	if (!entry) return new Response("Not found", { status: 404 });
	return new Response(String(entry.data.csv ?? ""), {
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `inline; filename="${params.slug}.csv"`,
		},
	});
};
