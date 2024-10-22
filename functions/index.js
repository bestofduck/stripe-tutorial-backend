const {onRequest} = require("firebase-functions/v2/https");
// Import the Secret Manager client and instantiate it:
const {SecretManagerServiceClient} = require("@google-cloud/secret-manager");
const client = new SecretManagerServiceClient();

const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');

initializeApp();


exports.getPaymentIntent = onRequest(async (req, res) => {
  const price = req.query.price;
  const currency = req.query.currency;
  const productID = req.query.productID;

  if (!price || !currency || !productID) res.status(400).send("Invalid Request. You must send a price, currency and productID with your request.");
  if (currency != 'eur') res.status(400).send("Invalid Request. Currency must be Euro.");

  // Access the secret.
  const [accessResponse] = await client.accessSecretVersion({
    name: "projects/235883929749/secrets/stripe-secret-key/versions/1",
  });

  const responsePayload = accessResponse.payload.data.toString("utf8");

  const stripe = require("stripe")(responsePayload);
  try{
    const customer = await stripe.customers.retrieve('cus_R4a1JHqBPjtM2j');
    const ephemeralKey = await stripe.ephemeralKeys.create(
      {customer: customer.id},
      {apiVersion: '2024-06-20'}
    );
    const paymentIntent = await stripe.paymentIntents.create({
      amount: price,
      currency: currency,
      customer: customer.id,

      // In the latest version of the API, specifying the `automatic_payment_methods` parameter
      // is optional because Stripe enables its functionality by default.
      automatic_payment_methods: {
        enabled: true,
      },
      metadata:{
        productID
      }
    });

    res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      displayName: "Doofenshmirtz Evil Inc."
    });
  }catch(e){
    res.status(500).send("An error has occurred while generating the payment intent.");
  }
});

exports.getEphemeralSecret = onRequest(async (req, res) => {
  // Access the secret.
  const [accessResponse] = await client.accessSecretVersion({
    name: "projects/235883929749/secrets/stripe-secret-key/versions/1",
  });

  const responsePayload = accessResponse.payload.data.toString("utf8");

  const stripe = require("stripe")(responsePayload);
  try{
    const ephemeralKey = await stripe.ephemeralKeys.create(
      {customer: 'cus_R4a1JHqBPjtM2j'},
      {apiVersion: '2024-06-20'}
    );

    res.json({
      ephemeralKey: ephemeralKey.secret,
      customer: 'cus_R4a1JHqBPjtM2j',
    });
  }catch(e){
    res.status(500).send("An error has occurred while generating the ephemeral key.");
  }
});

exports.savePaymentToDatabase = onRequest(async (req, res) => {
  if(!req.body) res.status(400).send("POST Request with body expected");
  
  // Access the secret.
  const [accessResponse] = await client.accessSecretVersion({
    name: "projects/235883929749/secrets/stripe-secret-key/versions/1",
  });

  const responsePayload = accessResponse.payload.data.toString("utf8");

  const stripe = require("stripe")(responsePayload);


  // Access the secret.
  const webhookSignature = await client.accessSecretVersion({
    name: "projects/235883929749/secrets/savePaymentToDBWebhookKey/versions/1",
  });

  const endpointSecret = webhookSignature[0].payload.data.toString("utf8");

  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  }
  catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const db = getFirestore();

  try{
    await db.collection('purchases').add({
      productID: req.body.metadata.productID,
      timestamp: req.body.created,
      price: req.body.amount
    })
  }
  catch (e){
    console.log(e)
  }

  res.send('Success');
});