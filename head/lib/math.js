/**
 * binary search function to find an index in an array
 *
 * @param {Array} haystack
 * @param {Object,Number} needle, key being searched for
 * @param {Function} comparator
 * @param {Number} alow - low guess (index) where the needle is
 * @param {Number} ahigh - high guess (index) where the needle is
 * @returs {Number} index when found, otherwise ~low
 * @api private
 */

function bs(haystack, needle, comparator, alow, ahigh) {
  if(!Array.isArray(haystack))
    throw new TypeError("first argument to binary search is not an array");

  if(typeof comparator !== "function")
    throw new TypeError("third argument to binary search is not a function");

  var low  = alow;
  var mid  = 0;
  var high = ahigh;
  var cmp  = 0;

  while(low <= high) {
    /* Note that "(low + high) >>> 1" may overflow, and results in a typecast
     * to double (which gives the wrong results). */
    mid = low + (high - low >> 1);
    cmp = comparator(haystack[mid], needle);

    /* Too low. */
    if(cmp < 0)
      low  = mid + 1;

    /* Too high. */
    else if(cmp > 0)
      high = mid - 1;

    /* Key found. */
    else
      return mid;
  }

  /* Key not found. */
  return ~low;
}

/**
 * Returns mantissa, exponent from a float
 *
 * @param {Float} x
 * @return {Object} mantissa, exponent
 * @api private
 */

function GetNumberParts(x) {
    var sig = x > 0 ? 1 : -1;
    x = Math.abs(x);
    var exp = Math.floor(Math.log(x)/Math.LN10);
    var man = x/Math.pow(10, exp);
    return {mantissa: sig*man, exponent: exp};
}


exports.bs = bs;
exports.GetNumberParts = GetNumberParts;
