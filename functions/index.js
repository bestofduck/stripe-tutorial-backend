const {onRequest} = require("firebase-functions/v2/https");
// Import the Secret Manager client and instantiate it:
const {SecretManagerServiceClient} = require("@google-cloud/secret-manager");
const client = new SecretManagerServiceClient();

const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');

initializeApp();

exports.viewProducts = onRequest(async (req, res) => {
  const db = getFirestore();

  const resp = await db.collection('cities').doc('LA').set({"test": "t"});

  // const products = response.data.map(item=>{
  //   return {
  //     id: item.id,
  //     name: item.name,
  //     price: item.default_price.unit_amount,
  //     currency: item.default_price.currency
  //   }
  // })

  res.json();
});

exports.addProduct = onRequest(async (req, res) => {
  if(req.method != "POST") res.status(405).send("Request type must be POST.")

  // Access the secret.
  const [accessResponse] = await client.accessSecretVersion({
    name: "projects/724582635633/secrets/stripe-secret-key/versions/1",
  });

  const responsePayload = accessResponse.payload.data.toString("utf8");

  const stripe = require("stripe")(responsePayload);
  try{
    const response = await stripe.products.create({
      name: req.body.product_name,
      default_price_data:{
        currency: "eur",
        unit_amount: req.body.price,
      }
    });

    res.status(200).send();
  }catch(e){
    res.status(500).send("An error has occurred while saving the product on Stripe.")
  }
});
