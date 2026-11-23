import { createApp } from "./app";
import { readVersion } from "./version";

const app = createApp(readVersion);

export default { fetch: app.fetch };
