const { createExportSpecifier } = require('./helpers');

/**
 * Transforms `module.exports` assignments into ES module export statements.
 *
 * This function converts different forms of `module.exports` to their ES module equivalents:
 * - Handles cases where properties are spread from other modules.
 * - `module.exports = { foo, bar };` → `export default { foo, bar };`
 * - `module.exports = someFunction;` → `export default someFunction;`
 *
 * @param {Object} root - The root AST node from jscodeshift.
 * @param {Object} j - The jscodeshift API for AST manipulation.
 */
function transformExport(root, j) {
  const spreadModules = new Set();

  // Identify spread modules in module.exports
  root.find(j.AssignmentExpression, {
    left: { object: { name: 'module' }, property: { name: 'exports' } }
  }).forEach((path) => {
    const { right } = path.value;
    if (right.type === 'ObjectExpression') {
      right.properties.forEach((prop) => {
        if (prop.type === 'SpreadElement' && prop.argument.type === 'Identifier') {
          spreadModules.add(prop.argument.name);
        }
      });
    }
  });

  // Transform module.exports = { foo, bar };
  root.find(j.AssignmentExpression, {
    left: {
      type: 'MemberExpression',
      object: { name: 'module' },
      property: { name: 'exports' }
    }
  }).forEach((path) => {
    const { right } = path.value;
    if (right.type === 'ObjectExpression') {
      // Filter valid properties with proper key names
      const validProps = right.properties.filter(
        (prop) => prop.type === 'Property' && prop.key && typeof prop.key.name === 'string'
      );
      // Use named export if all properties are using shorthand
      const allShorthand = validProps.every((prop) => prop.shorthand === true);

      const spreadProps = right.properties.filter((prop) => prop.type === 'SpreadElement');

      if (validProps.length === 1 && spreadProps.length === 0 && allShorthand) {
        // Convert to: export default { foo };
        const exportDecl = j.exportDefaultDeclaration(right);
        j(path.parent).replaceWith(exportDecl);
      } else if (allShorthand && spreadProps.length === 0) {
        // Convert to: export { foo, bar };
        const exportSpecifiers = validProps.map(prop =>
          createExportSpecifier(j, prop.key.name)
        );
        const exportDecl = j.exportNamedDeclaration(null, exportSpecifiers);
        j(path.parent).replaceWith(exportDecl);
      } else {
        // Convert to: export default { ...module, foo: foo, bar: bar };
        const exportDecl = j.exportDefaultDeclaration(right);
        j(path.parent).replaceWith(exportDecl);
      }
    }
  });

  // Transform module.exports = someFunction;
  root.find(j.AssignmentExpression, {
    left: {
      type: 'MemberExpression',
      object: { name: 'module' },
      property: { name: 'exports' }
    }
  }).forEach((path) => {
    const { right } = path.value;
    if (right.type !== 'ObjectExpression') {
      // Convert to: export default someFunction;
      const exportDecl = j.exportDefaultDeclaration(right);
      j(path.parent).replaceWith(exportDecl);
    }
  });
}

module.exports = transformExport;
