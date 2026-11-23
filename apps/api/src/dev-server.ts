import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { readVersion } from "./version";

const port = Number(process.env.API_PORT ?? 8787);

serve({ fetch: createApp(readVersion).fetch, port });
