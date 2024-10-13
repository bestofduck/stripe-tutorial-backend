const {onRequest} = require("firebase-functions/v2/https");


// Take the text parameter passed to this HTTP endpoint and insert it into
// Firestore under the path /messages/:documentId/original
exports.addmessage = onRequest(async (req, res) => {
  // Grab the text parameter.
  const original = req.query.text;

  res.json({result: `Message with ID: ${original} added.`});
});


// Import the Secret Manager client and instantiate it:
const {SecretManagerServiceClient} = require("@google-cloud/secret-manager");
const client = new SecretManagerServiceClient();

/**
 * TODO(developer): Uncomment these variables before running the sample.
 */


exports.viewProducts = onRequest(async (req, res) => {
  // Access the secret.
  const [accessResponse] = await client.accessSecretVersion({
    name: "projects/724582635633/secrets/stripe-secret-key/versions/1",
  });

  const responsePayload = accessResponse.payload.data.toString("utf8");

  const stripe = require("stripe")(responsePayload);
  console.log(responsePayload);
  const products = await stripe.products.list();

  res.json(products);
});
