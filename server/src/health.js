export const checkDatabaseHealth = async (database) => {
  try {
    await database.query("select 1");
    return true;
  } catch {
    return false;
  }
};
