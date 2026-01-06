import { query } from "./db";

export type ClientConnection = {
  id: number;
  alias: string;
  name?: string | null;
}

export async function getConnecters(userId: number): Promise<ClientConnection[]> {
  try {
    const res = await query(
      `SELECT u.id, u.alias, u.name
FROM user_connections ucx
JOIN users u on u.id = ucx.user_id
WHERE ucx.connection_id = $1
ORDER BY ucx.created_at DESC
      `,
      [userId]
    );

    return res.rows.map((r) => ({
      id: r.id,
      alias: r.alias,
      name: r.name,
    }));
  } catch (err) {
    console.error('getUserConnections error', err);
    return [];
  }
}