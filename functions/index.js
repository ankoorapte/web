const admin = require("firebase-admin");
const functions = require("firebase-functions");
const cors = require("cors")({origin: true});
admin.initializeApp();

const auth = admin.auth();
const db = admin.firestore();
const tracks = db.collection("tracks");
const layers = db.collection("layers");

exports.pLayerAPI = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    const decodedToken = await auth.verifyIdToken(req.body.id);
    let user = await auth.getUser(decodedToken.uid);
    res.status(200).send(user);
  });
});

// To deploy, run in "functions" directory:
// gcloud functions deploy updateDB --runtime nodejs16
// --trigger-resource player-76353.appspot.com
// --trigger-event google.storage.object.finalize
exports.updateDB = async (file, context) => {
  const uid = file.name;
  const name = file.metadata.name;
  const user = file.metadata.user;
  const base = file.metadata.base;
  const isBase = !base.length; // empty string means isBase

  await layers.doc(uid).set({
    bucket: uid,
    name: name,
    base: base,
    user: user,
    resolved: isBase, // if isBase, resolved!
    timestamp: file.updated,
  });

  if (isBase) {
    await tracks.doc(uid).set({
      layers: [uid],
      name: name,
    });
  }
};
