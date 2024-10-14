const {onRequest} = require("firebase-functions/v2/https");
// Import the Secret Manager client and instantiate it:
const {SecretManagerServiceClient} = require("@google-cloud/secret-manager");
const client = new SecretManagerServiceClient();

exports.viewProducts = onRequest(async (req, res) => {
  // Access the secret.
  const [accessResponse] = await client.accessSecretVersion({
    name: "projects/724582635633/secrets/stripe-secret-key/versions/1",
  });

  const responsePayload = accessResponse.payload.data.toString("utf8");

  const stripe = require("stripe")(responsePayload);
  const response = await stripe.products.list({
    expand: ['data.default_price']
  });

  const products = response.data.map(item=>{
    return {
      id: item.id,
      name: item.name,
      price: item.default_price.unit_amount,
      currency: item.default_price.currency
    }
  })

  res.json(products);
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
