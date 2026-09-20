const { MongoClient } = require('mongodb');

async function cleanGarbage() {
  const uri = 'mongodb+srv://medilocker:mx71X3dQ1M4iigHI@cluster0.qomirho.mongodb.net/?appName=Cluster0';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('medilocker');

  // Find garbage mock docs
  const garbageDocs = await db.collection('documents').find({
    $or: [
      { ownerUserId: { $regex: /demo|anon|mock/i } },
      { originalName: { $regex: /fake|mock|test/i } },
      { id: { $in: ['fake-doc-1', 'fake-doc-2'] } }
    ]
  }).toArray();

  console.log('Found garbage docs to delete:', garbageDocs.length);
  const ids = garbageDocs.map(d => d.id);
  if (ids.length > 0) {
    await db.collection('documents').deleteMany({ id: { $in: ids } });
    await db.collection('documentVersions').deleteMany({ documentId: { $in: ids } });
    await db.collection('ocrOutputs').deleteMany({ documentId: { $in: ids } });
    await db.collection('userVitals').deleteMany({ documentId: { $in: ids } });
    console.log('Deleted garbage document records for ids:', ids);
  }

  // Also clean old pending jobs that failed or are from demo/anon
  const jobsRes = await db.collection('jobs').deleteMany({
    $or: [
      { 'payload.ownerUserId': { $regex: /demo|anon/i } },
      { status: 'failed' }
    ]
  });
  console.log('Cleaned stale jobs count:', jobsRes.deletedCount);

  // Check remaining docs
  const remaining = await db.collection('documents').countDocuments();
  console.log('Remaining documents count in MongoDB:', remaining);

  await client.close();
}

cleanGarbage().catch(console.error);
