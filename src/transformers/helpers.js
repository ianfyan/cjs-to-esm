/**
 * Creates an ExportSpecifier for a given identifier.
 *
 * @param {Object} j - The jscodeshift API object.
 * @param {string} localName - The local variable name to be exported.
 * @returns {Object} An ExportSpecifier AST node.
 */
function createExportSpecifier(j, localName) {
  return {
    type: 'ExportSpecifier',
    local: j.identifier(localName),
    exported: j.identifier(localName)
  };
}

module.exports = { createExportSpecifier };
