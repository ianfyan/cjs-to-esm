/**
 * Transforms `__dirname` and `__filename` usage in CommonJS to their ESM equivalents.
 *
 * This function replaces `__dirname` and `__filename` with:
 * - `import.meta.url` and `fileURLToPath(import.meta.url)` for `__filename`
 * - `path.dirname(__filename)` for `__dirname`
 *
 * Additionally, it ensures that necessary imports (`path` and `fileURLToPath` from `url`)
 * are added at the top of the file while avoiding duplicates.
 *
 * @param {Object} root - The root AST node from jscodeshift.
 * @param {Object} j - The jscodeshift API to manipulate the AST.
 */
function transformDirname(root, j) {
  const programBody = root.get().node.program.body;

  let hasDirname = false;
  let hasFilename = false;

  // Check if __dirname or __filename exists
  root.find(j.Identifier, { name: '__dirname' }).forEach(() => {
    hasDirname = true;
  });

  root.find(j.Identifier, { name: '__filename' }).forEach(() => {
    hasFilename = true;
  });

  if (hasDirname || hasFilename) {
    const firstNode = programBody[0];
    const firstComment = firstNode?.comments?.length
      ? programBody.shift()
      : null;

    // Remove existing imports for 'path' and 'url' to avoid duplicates
    root.find(j.ImportDeclaration)
      .filter((path) => ['path', 'url'].includes(path.node.source.value))
      .remove();

    // Add correct imports at the beginning of the file
    const newImports = [
      j.importDeclaration(
        [j.importDefaultSpecifier(j.identifier('path'))],
        j.literal('path')
      ),
      j.importDeclaration(
        [j.importSpecifier(j.identifier('fileURLToPath'))],
        j.literal('url')
      )
    ];

    // Add __filename and __dirname declarations if needed
    const newDeclarations = [];

    if (hasFilename) {
      newDeclarations.push(j.variableDeclaration('const', [
        j.variableDeclarator(
          j.identifier('__filename'),
          j.callExpression(j.identifier('fileURLToPath'), [
            j.memberExpression(j.identifier('import'), j.identifier('meta.url'))
          ])
        )
      ]));
    }

    if (hasDirname) {
      if (!hasFilename) {
        // Ensure __filename is defined if __dirname is used
        newDeclarations.push(j.variableDeclaration('const', [
          j.variableDeclarator(
            j.identifier('__filename'),
            j.callExpression(j.identifier('fileURLToPath'), [
              j.memberExpression(j.identifier('import'), j.identifier('meta.url'))
            ])
          )
        ]));
      }
      newDeclarations.push(j.variableDeclaration('const', [
        j.variableDeclarator(
          j.identifier('__dirname'),
          j.callExpression(
            j.memberExpression(j.identifier('path'), j.identifier('dirname')),
            [j.identifier('__filename')]
          )
        )
      ]));
    }

    const updatedBody = [...newImports, ...newDeclarations, ...programBody];

    if (firstComment) {
      updatedBody.unshift(firstComment);
    }

    // Ensure imports and declarations appear at the beginning, before original code
    root.get().node.program.body = updatedBody;
  }
}

module.exports = transformDirname;
