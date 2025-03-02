/**
 * Transforms `exports.property = value` assignments into ES module exports.
 *
 * This function handles two main cases:
 * - If there is only one `exports.property = value`,
 *   it converts it to `export default value;`
 *
 * - If there are multiple `exports.property = value`,
 *   it converts them to `export const property = value;`
 *
 * @param {Object} root - The root AST node from jscodeshift.
 * @param {Object} j - The jscodeshift API for AST manipulation.
 */
function transformExportProperty(root, j) {
  const exportAssignments = root.find(j.AssignmentExpression, {
    left: {
      type: 'MemberExpression',
      object: { name: 'exports' }
    }
  });

  if (exportAssignments.size() === 1) {
    // If there is only one export, convert it to export default
    exportAssignments.forEach((path) => {
      const { right } = path.value;
      const exportDecl = j.exportDefaultDeclaration(right);
      j(path.parent).replaceWith(exportDecl);
    });
  } else {
    // If there are multiple exports, convert them to export const
    exportAssignments.forEach((path) => {
      const { left } = path.value;
      const { right } = path.value;

      if (left.property && left.property.name) {
        const exportDecl = j.exportNamedDeclaration(
          j.variableDeclaration('const', [
            j.variableDeclarator(j.identifier(left.property.name), right)
          ])
        );
        j(path.parent).replaceWith(exportDecl);
      }
    });
  }
}

module.exports = transformExportProperty;
