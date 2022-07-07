import Random from "@reactioncommerce/random";

/**
 * @summary Figures out which fulfillment group a cart item should initially be in
 * @param {Object[]} currentGroups The current cart fulfillment groups array
 * @param {String[]} supportedFulfillmentTypes Array of fulfillment types supported by the item
 * @param {String} shopId The ID of the shop that owns the item (product)
 * @returns {Object|null} The group or null if no viable group
 */
function determineInitialGroupForItem(currentGroups, supportedFulfillmentTypes, shopId) {
  const compatibleGroup = currentGroups.find((group) => supportedFulfillmentTypes.includes(group.type) &&
    shopId === group.shopId);
  return compatibleGroup || null;
}

/**
 * @summary Check if the provided fulfillment type is present in any of the groups and adds if not
 * @param {Object[]} currentGroups The current cart fulfillment groups array
 * @param {String} fulfillmentType Specific fulfillment type to be checked
 * @param {String} shopId The ID of the shop that owns the item (product)
 * @returns {undefined}
 */
 function checkAndAddToGroup(currentGroups, fulfillmentType, item) {
  const group = determineInitialGroupForItem(currentGroups, [fulfillmentType], item.shopId);
  if (!group) {
    // If no compatible group, add one with initially just this item in it
    currentGroups.push({
      _id: Random.id(),
      itemIds: [item._id],
      shopId: item.shopId,
      type: fulfillmentType
    });
  } else if (!group.itemIds) {
    // If there is a compatible group but it has no items array, add one with just this item in it
    group.itemIds = [item._id];
  } else if (!group.itemIds.includes(item._id)) {
    // If there is a compatible group with an items array but it is missing this item, add this item ID to the array
    group.itemIds.push(item._id);
  }
}

/**
 * @summary Updates the `shipping` property on a `cart`
 * @param {Object} context App context
 * @param {Object} cart The cart, to be mutated
 * @returns {undefined}
 */
export default function updateCartFulfillmentGroups(context, cart) {
  // Every time the cart is updated, create any missing fulfillment groups as necessary.
  // We need one group per type per shop, containing only the items from that shop.
  // Also make sure that every item is assigned to a fulfillment group.
  // Update: Refer MCOSS-52: 
  // 1. If the selectedFulfillmentType is not provided for an item, then 
  //    that item should be present in all groups corresponding to it's supportedFulfillmentTypes
  //    If selectedFulfillmentType is provided, we keep the item only in that group.

  const currentGroups = cart.shipping || [];

  (cart.items || []).forEach((item) => {
    let { supportedFulfillmentTypes } = item;

    // This is a new optional field that UI can pass in case the user selects fulfillment type 
    // for each item in the product details page instead of waiting till checkout
    let { selectedFulfillmentType } = item; 

    // Do not re-allocate the item if it is already in the group. Otherwise difficult for other code
    // to create and manage fulfillment groups
    // Commenting out the below check since the item should below to all supported groups,
    // and not just one if the selectedFulfillmentType is not provided.
    // const itemAlreadyInTheGroup = currentGroups.find(({ itemIds }) => itemIds && itemIds.includes(item._id));
    // if (itemAlreadyInTheGroup) return;

    if (!supportedFulfillmentTypes || supportedFulfillmentTypes.length === 0) {
      supportedFulfillmentTypes = ["shipping"];
    }

    // Out of the current groups, returns the one that this item should be in by default, if it isn't
    // already in a group
    // If selectedFulfillmentType is provided, add the item only to that group, else add item to all supported groups
    if (selectedFulfillmentType) {
      checkAndAddToGroup(currentGroups, selectedFulfillmentType, item);
    } else {
      supportedFulfillmentTypes.forEach(ffType => {
        checkAndAddToGroup(currentGroups, ffType, item);
      });
    }
  });

  // Items may also have been removed. Need to remove their IDs from each group.itemIds
  currentGroups.forEach((group) => {
    group.itemIds = (group.itemIds || []).filter((itemId) => !!cart.items.find((item) => item._id === itemId));
  });

  cart.shipping = currentGroups;
}
