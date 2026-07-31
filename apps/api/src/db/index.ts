import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../env.js";
import { schema } from "./schema.js";

const pool = new Pool({ connectionString: env.databaseUrl });

export const db = drizzle(pool, { schema });
export { schema };
