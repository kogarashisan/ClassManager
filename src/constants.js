/**
 * Include error texts into the build.
 * Otherwise, errors will provide a link to ClassManager's site, where you will see
 * human-readable error descriptions
 * @type {boolean}
 * @const
 */
var __CM_INCLUDE_ERROR_DESCRIPTIONS__ = true;
/**
 * This switch checks for obvious rules violations, like property-by-function replacement in inherited classes,
 * or wrong directive usage. If you absolutely know, that you construct only valid classes - then you may want
 * to turn this off. Disabling this switch will produce a faster build of ClassManager.
 *
 * How you can assure, that all your classes are valid: you need to test them with DEBUG version of ClassManager,
 * where this switch is enabled. If your classes are constructed without errors - it means they have passed all these
 * extra checks, and these checks can be turned off in production.
 *
 * So you can safely disable it under the following conditions:
 * 1. Your project has unit tests, which construct all your classes
 * 2. For testing purposes you use DEBUG version of ClassManager, where this switch is enabled.
 *
 * @type {boolean}
 * @const
 */
var __CM_ENABLE_SAFE_MODE__ = true;
/**
 * Micro-optimization.
 * Whether to serialize them and inline as a value, when building constructor,
 * or slice() from original array in original class body.
 * Recommended to leave as-is, as it produces faster constructors
 * @type {boolean}
 * @const
 */
var __CM_INLINE_SIMPLE_ARRAYS__ = true;
/**
 * Micro-optimization.
 * Maximum length of arrays, which can be inlined. Recommended to leave as is
 * @type {number}
 * @const
 */
var __CM_MAX_INLINED_ARRAY_LENGTH__ = 10;
/**
 * Build tool replaces this with current package version.
 *
 * This is used to send you to ClassManager's site for error texts, if they are not included in build.
 * If you are building CM yourself - you should read it's `package.json` for version, like native builder does
 *
 * @type {string}
 * @const
 */
var __CM_VERSION__ = "0.0.0";

// @todo
/**
 * Where minified version will send you for descriptions
 * @type {string}
 * @const
 */
var __CM_ERROR_DECODER_URL__ = "https://_todo_/error_decoder.html";