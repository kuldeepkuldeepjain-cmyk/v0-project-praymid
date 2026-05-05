import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export const getPool = () => {
  if (!pool) {
    const host = process.env.DB_HOST || 'localhost';
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD;
    const database = process.env.DB_NAME;

    if (!password || !database) {
      throw new Error('DB_PASSWORD and DB_NAME environment variables are required');
    }

    pool = mysql.createPool({
      host,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
    });
  }
  return pool;
};

export const query = async (text: string, params?: any[]) => {
  const connection = await getPool().getConnection();
  try {
    const [result] = await connection.execute(text, params || []);
    return result;
  } finally {
    connection.release();
  }
};