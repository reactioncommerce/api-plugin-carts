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
export default async function anonymousCartByCartId(
  context,
  { cartId, cartToken } = {}
) {
  const { collections } = context;
  const { Cart } = collections;

  if (!cartId) {
    throw new ReactionError("invalid-param", "You must provide a cartId");
  }

  const anonymousAccessToken = hashToken(cartToken);
  // Creates a client
  Logger.debug("anonymousCartByCartId starting", { cartId, anonymousAccessToken });
  const spanner = new Spanner.Spanner({
    projectId: process.env.SPANNER_PROJECT,
  });

  // Gets a reference to a Cloud Spanner instance and database
  const instance = spanner.instance(process.env.SPANNER_INSTANCE);
  const database = instance.database(process.env.SPANNER_DATABASE);

  const query = {
    sql: `SELECT * FROM Carts
            WHERE
              id = @cartId
              AND anonymousAccessToken = @anonymousAccessToken
            LIMIT 1;`,
    params: { cartId, anonymousAccessToken },
  };

  try {
    const [[firstRow]] = await database.run(query);
    if (!firstRow) {
      return null;
    }
    const goodRow = firstRow.toJSON();
    goodRow.items = JSON.parse(goodRow.items || null);
    goodRow.shipping = JSON.parse(goodRow.shipping || null);
    goodRow.billing = JSON.parse(goodRow.billing || null);
    goodRow.workflow = JSON.parse(goodRow.workflow || null);
    goodRow._id = goodRow.id;
    return goodRow;
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await database.close();
  }
}
