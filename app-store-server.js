const fs = require('fs');
const jwt = require('jsonwebtoken');
const {
    AppStoreServerAPIClient,
    Environment,
    SignedDataVerifier,
    ReceiptUtility,
    Order,
    ProductType,
    TransactionHistoryRequest,
    PromotionalOfferSignatureCreator
} = require('@apple/app-store-server-library');

// Configuration
const issuerId = '3c9532be-254f-4b2c-925e-edeaa1f9ae6b';
const keyId = 'UJ8RHMKF3T';
const bundleId = 'Nexever.Whats.com';
const privateKeyPath = 'SubscriptionKey_UJ8RHMKF3T.p8';
const encodedKey = fs.readFileSync(privateKeyPath, 'utf8');
const environment = Environment.SANDBOX;
const testNotificationToken = '663fd962-b5cb-4467-9ea8-df9a955c36a4_1725341426945';
const appleRootCAPath = 'AppleRootCA-G3.pem';


// Read the private key from file
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const appleRootCA = fs.readFileSync(appleRootCAPath, 'utf8');
// Define the payload and headers
const payload = {
  iss: issuerId,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (1 * 24 * 60 * 60), // 1 days from now
  aud: 'appstoreconnect-v1',
  notification_type: 'DID_RENEW',
  environment: 'SANDBOX',
  auto_renew_status: 'true',
  expires_date_ms: '1633113600000',
  in_app: [
    {
      product_id: 'com.example.product',
      transaction_id: '1000000322101234',
      purchase_date_ms: '1630524800000',
      original_transaction_id: '1000000222101234',
      is_trial_period: 'false',
      original_purchase_date_ms: '1623158400000',
      subscription_group_identifier: '1234567890',
      cancellation_date_ms: null
    }
  ]
};

const headers = {
  alg: 'ES256',
  kid: keyId,
  typ: 'JWT'
};

// Create JWT token
const notificationPayload = jwt.sign(payload, privateKey, { algorithm: 'ES256', header: headers });

console.log('Notification Payload:', notificationPayload);

const verifier = new SignedDataVerifier([appleRootCA], true, Environment.SANDBOX, bundleId);

// Handle New Subscription
async function handleNewSubscription(notificationPayload) {
  try {
    // Verify the notification
    const verifiedNotification = await verifyNotification(notificationPayload);

    // Extract subscription details from the verified notification
    const subscriptionDetails = {
      transactionId: verifiedNotification.transaction_id,
      productId: verifiedNotification.product_id,
      purchaseDate: verifiedNotification.purchase_date,
      expirationDate: verifiedNotification.expiration_date,
      // Add other relevant details here
    };

    // Perform subscription logic (e.g., save to database, update user records)
    console.log('Handling new subscription:', subscriptionDetails);

    // Example: Save to database (pseudo-code)
    // await saveSubscriptionToDatabase(subscriptionDetails);

  } catch (error) {
    console.error('Error handling new subscription:', error);
  }
}

// Test Notification
async function requestTestNotification() {
    const client = new AppStoreServerAPIClient(privateKey, keyId, issuerId, bundleId, environment);
    try {
    // Create JWT token
    const token = await  jwt.sign(payload, privateKey, { algorithm: 'ES256', header: headers });
    console.log('JWT Token:', token);
        const response = await client.requestTestNotification();
        console.log('Test Notification Response:', response);
    } catch (error) {
        console.error('Error requesting test notification:', error);
    }
}

// Verify Notification
async function verifyNotification(notificationPayload) {
    // Load Apple Root Certificates (example: using a dummy certificate here)
    const appleRootCAs = [/* Load your Apple Root Certificates here */];
    const verifier = new SignedDataVerifier(appleRootCAs, true, environment, bundleId);
    try {
        const verifiedNotification = await verifier.verifyAndDecodeNotification(notificationPayload);
        console.log('Verified Notification:', verifiedNotification);
    } catch (error) {
        console.error('Error verifying notification:', error);
    }
}

// Get Transaction History
async function getTransactionHistory(appReceipt) {
    const client = new AppStoreServerAPIClient(privateKey, keyId, issuerId, bundleId, environment);
    const receiptUtil = new ReceiptUtility();
//    const transactionId = receiptUtil.extractTransactionIdFromAppReceipt(appReceipt);
    const transactionId = 2000000674690627;
    if (transactionId) {
        const transactionHistoryRequest = {
            sort: Order.ASCENDING,
            revoked: false,
            productTypes: [ProductType.AUTO_RENEWABLE]
        };
        let response = null;
        let transactions = [];
        do {
            const revisionToken = response !== null && response.revision !== null ? response.revision : null;
            response = await client.getTransactionHistory(transactionId, revisionToken, transactionHistoryRequest);
            if (response.signedTransactions) {
                transactions = transactions.concat(response.signedTransactions);
            }
        } while (response.hasMore);
        console.log('Transaction History:', transactions);
    } else {
        console.error('Invalid transaction ID.');
    }
}

// Create Promotional Offer Signature
function createPromotionalOfferSignature(productId, subscriptionOfferId, applicationUsername, nonce) {
    const signatureCreator = new PromotionalOfferSignatureCreator(privateKey, keyId, bundleId);
    const timestamp = Date.now();
    try {
        const signature = signatureCreator.createSignature(productId, subscriptionOfferId, applicationUsername, nonce, timestamp);
        console.log('Promotional Offer Signature:', signature);
    } catch (error) {
        console.error('Error creating promotional offer signature:', error);
    }
}

// Usage Examples
(async () => {
    // Request a test notification
    await requestTestNotification();

//    // Example payload for verification (replace with actual payload)
//    const notificationPayload = 'ey...'; // Replace with actual payload
//    await verifyNotification(notificationPayload);
//
//    // Example app receipt (replace with actual receipt)
//    const appReceipt = 'MI...'; // Replace with actual receipt
//    await getTransactionHistory(appReceipt);
     // Handle the new subscription
      await handleNewSubscription(notificationPayload);
//    // Example promotional offer signature (replace with actual values)
//    createPromotionalOfferSignature('product_id', 'offer_id', 'username', 'nonce'); // Replace with actual values
})();
