// Creates compound index and optional TTL on audit_logs
(function () {
  const dbName = process.env.MONGO_INITDB_DATABASE || 'prairiemed';
  const coll = 'audit_logs';
  const conn = new Mongo().getDB(dbName);

  print('Using DB:', dbName);

  // compound index for queries
  conn.getCollection(coll).createIndex(
    { eventType: 1, timestamp: -1 },
    { name: 'eventType_1_timestamp_-1' }
  );

  // TTL (90 days) — comment out if you don't want TTL
  // conn.getCollection(coll).createIndex(
  //   { timestamp: 1 },
  //   { name: 'ttl_90d', expireAfterSeconds: 60 * 60 * 24 * 90 }
  // );

  print('Indexes now:');
  printjson(conn.getCollection(coll).getIndexes());
})();
