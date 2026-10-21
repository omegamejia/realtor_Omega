import { allRoutes, isNoIndex } from "@/lib/routes";

/**
 * The complete route list, for the launch and schema gates.
 *
 * /sitemap.xml carries only indexable routes, which is correct for Google but
 * would leave the gates blind to the funnel pages. This endpoint returns
 * everything, so "no page is unwritten" stays a claim about the whole site.
 *
 * Not linked from anywhere and marked noindex. It exposes nothing that is not
 * already public in the navigation.
 */
export const dynamic = "force-static";

export function GET() {
  const routes = allRoutes();
  return Response.json(
    {
      count: routes.length,
      routes,
      noindex: routes.filter(isNoIndex),
    },
    { headers: { "X-Robots-Tag": "noindex, nofollow" } }
  );
}
