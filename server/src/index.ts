import 'dotenv/config';
import { app } from './app.js';

const PORT = Number(process.env.PORT) || 8787;
app.listen(PORT, () => {
  console.log(`LifeOS backend listening on http://localhost:${PORT}`);
});
