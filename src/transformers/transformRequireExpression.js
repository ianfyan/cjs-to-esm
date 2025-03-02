/**
 * Transforms `require().method()` calls into ES module `import` statements.
 *
 * @param {Object} root - The root AST node from jscodeshift.
 * @param {Object} j - The jscodeshift API for AST manipulation.
 */
function transformRequireExpression(root, j) {
  root.find(j.ExpressionStatement, {
    expression: {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'CallExpression', callee: { name: 'require' } }
      }
    }
  }).forEach((path) => {
    const callExpr = path.value.expression;
    const moduleName = callExpr.callee.object.arguments[0].value;
    const method = callExpr.callee.property.name;

    // Create import statement
    const importDecl = j.importDeclaration(
      [j.importDefaultSpecifier(j.identifier(moduleName))],
      j.literal(moduleName)
    );

    // Replace require with method call
    const newStatement = j.expressionStatement(
      j.callExpression(
        j.memberExpression(j.identifier(moduleName), j.identifier(method)),
        callExpr.arguments
      )
    );

    // Prepend the import declaration at the top
    root.get().node.program.body.unshift(importDecl);
    j(path).replaceWith(newStatement);
  });
}

module.exports = transformRequireExpression;
