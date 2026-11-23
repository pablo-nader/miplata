import { composeApp } from "./shared/compose";

const app = composeApp();

export default { fetch: app.fetch };
