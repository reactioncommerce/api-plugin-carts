import hashToken from "@reactioncommerce/api-utils/hashToken.js";
import ReactionError from "@reactioncommerce/reaction-error";
import Logger from "@reactioncommerce/logger";
import Spanner from "@google-cloud/spanner";

/**
 * @name anonymousCartByCartId
 * @method
 * @memberof Cart/NoMeteorQueries
 * @summary Query the Cart collection for a cart with the provided cartId
 * @param {Object} context - an object containing the per-request state
 * @param {Object} params - request parameters
 * @param {String} [params.cartId] - Cart id to include
 * @param {String} [params.token] - Anonymous cart token
 * @returns {Promise<Object>|undefined} - A Cart document, if one is found
 */
export default async function anonymousCartByCartId(context, { cartId, cartToken } = {}) {
  Logger.info("hi4", {cartId});
  const { collections } = context;
  const { Cart } = collections;

  if (!cartId) {
    throw new ReactionError("invalid-param", "You must provide a cartId");
  }

  // Creates a client
  const spanner = new Spanner.Spanner({ projectId: process.env.SPANNER_PROJECT });

  // Gets a reference to a Cloud Spanner instance and database
  const instance = spanner.instance(process.env.SPANNER_INSTANCE);
  const database = instance.database(process.env.SPANNER_DATABASE);

  const query = {
    sql: 'SELECT * FROM Carts',
  };

  // Queries rows from the Albums table
  try {
    const [[firstRow]] = await database.run(query);
    console.log("firstRow", firstRow);
    const goodRow = firstRow.toJSON();
    console.log("goodRow", goodRow);
    console.log("parsing items");
    goodRow.items = goodRow.items && JSON.parse(goodRow.items);
    console.log("parsing shipping");
    goodRow.shipping = goodRow.shipping && JSON.parse(goodRow.shipping);
    console.log("parsing billing");
    goodRow.billing = goodRow.billing && JSON.parse(goodRow.billing);
    console.log("parsing workflow");
    goodRow.workflow = goodRow.workflow && JSON.parse(goodRow.workflow);
    goodRow._id = goodRow.id;
    return goodRow;
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    // Close the database when finished.
    await database.close();
  }
}
