import { app } from './app';
import { config } from './config/env';

const port = config.port;

app.listen(port, () => {
  console.log(`[MiniLedger API] Server listening on port ${port}`);
  console.log(`[MiniLedger API] Health check at http://localhost:${port}/api/health`);
});
