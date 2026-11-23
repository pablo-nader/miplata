import { serve } from "@hono/node-server";
import { composeApp } from "./shared/compose";

const port = Number(process.env.API_PORT ?? 8787);

serve({ fetch: composeApp().fetch, port });
