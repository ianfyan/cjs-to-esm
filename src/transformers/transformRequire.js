const fs = require('fs');
const path = require('path');

const { toCamelCase } = require('node-string-utils');

/**
 * Resolves the correct module path for require statements.
 * Handles:
 * - Relative paths (`./module` → `./module.js` or `./module/index.js`)
 * - JSON files (`./data.json` → `./data.json`)
 * - Default JavaScript file extensions
 *
 * @param {string} moduleName - The original module name from require().
 * @param {string} filePath - The file path of the current module.
 * @returns {string} - The resolved module path.
 */
function resolveModulePath(moduleName, filePath) {
  const baseDir = path.dirname(filePath);
  const absolutePath = path.resolve(baseDir, moduleName);

  if ((moduleName.startsWith('.') || moduleName.startsWith('..')) && !path.extname(moduleName)) {
    if (fs.existsSync(`${absolutePath}.js`)) { return `${moduleName}.js`; }
    if (fs.existsSync(`${absolutePath}.json`)) { return `${moduleName}.json`; }
    if (fs.existsSync(path.join(absolutePath, 'index.js'))) { return `${moduleName}/index.js`; }
  }

  return moduleName;
}

/**
 * Handles JSON file imports by converting require() calls to import assertions.
 *
 * @param {Object} j - The jscodeshift API.
 * @param {Object} modulePath - The AST node representing the require() call.
 * @param {Object} decl - The variable declaration node.
 */
function handleJsonImport(j, modulePath, decl) {
  const importDecl = j.template.statement([
    `import ${decl.id.name} from '${decl.init.arguments[0].value}' with { type: 'json' };`
  ]);
  j(modulePath).replaceWith(importDecl);
}

/**
 * Converts default imports from require() to ES6 import statements.
 *
 * @param {Object} j - The jscodeshift API.
 * @param {Object} modulePath - The AST node representing the require() call.
 * @param {Object} decl - The variable declaration node.
 * @param {Set} spreadModules - Modules that require namespace imports.
 */
function handleDefaultImport(j, modulePath, decl, spreadModules) {
  const localName = decl.id.name;
  const needsTempVariable = modulePath.value.kind === 'let' || modulePath.value.kind === 'var';
  const importName = needsTempVariable ? `_${localName}` : localName;

  const importDecl = spreadModules.has(localName)
    ? j.importDeclaration(
      [j.importNamespaceSpecifier(j.identifier(importName))],
      j.literal(decl.init.arguments[0].value)
    )
    : j.importDeclaration(
      [j.importDefaultSpecifier(j.identifier(importName))],
      j.literal(decl.init.arguments[0].value)
    );

  if (needsTempVariable) {
    const assignment = j.variableDeclaration(modulePath.value.kind, [
      j.variableDeclarator(j.identifier(localName), j.identifier(importName))
    ]);
    j(modulePath).replaceWith([importDecl, assignment]);
  } else {
    j(modulePath).replaceWith(importDecl);
  }
}

/**
 * Converts named imports from require() to ES6 import statements.
 *
 * @param {Object} j - The jscodeshift API.
 * @param {Object} root - The root AST node.
 * @param {Object} modulePath - The AST node representing the require() call.
 * @param {Object} decl - The variable declaration node.
 * @param {Map} usedIdentifiers - A map tracking used identifiers to prevent conflicts.
 */
function handleNamedImport(j, root, modulePath, decl, usedIdentifiers) {
  const moduleName = decl.init.arguments[0].value;
  let baseName = path.basename(moduleName, '.js');
  if (baseName === 'index') { baseName = path.basename(path.dirname(moduleName)); }

  let identifierName = toCamelCase(baseName);
  if (usedIdentifiers.has(identifierName)) { identifierName = `_${identifierName}`; }
  usedIdentifiers.set(identifierName, moduleName);

  const importDecl = j.importDeclaration(
    [j.importDefaultSpecifier(j.identifier(identifierName))],
    j.literal(moduleName)
  );
  root.get().node.program.body.unshift(importDecl);

  modulePath.replace(j.variableDeclaration(
    modulePath.value.kind,
    [j.variableDeclarator(decl.id, j.identifier(identifierName))]
  ));
}

/**
 * Transforms `require()` calls into ES module `import` statements.
 *
 * @param {Object} fileInfo - Information about the file being transformed.
 * @param {Object} root - The root AST node from jscodeshift.
 * @param {Object} j - The jscodeshift API for AST manipulation.
 */
function transformRequire(fileInfo, root, j) {
  const filePath = fileInfo.path;
  const spreadModules = new Set();
  const usedIdentifiers = new Map();
  const firstNode = root.get().node.program.body[0];
  const firstComment = firstNode?.comments?.length ? firstNode.comments : null;

  root.find(j.AssignmentExpression, {
    left: { object: { name: 'module' }, property: { name: 'exports' } }
  }).forEach((expPath) => {
    if (expPath.value.right.type === 'ObjectExpression') {
      expPath.value.right.properties.forEach((prop) => {
        if (prop.type === 'SpreadElement' && prop.argument.type === 'Identifier') {
          spreadModules.add(prop.argument.name);
        }
      });
    }
  });

  root.find(j.VariableDeclaration).forEach((modulePath) => {
    const decl = modulePath.value.declarations[0];
    if (!decl.init || decl.init.type !== 'CallExpression' || decl.init.callee.name !== 'require') { return; }

    const moduleName = resolveModulePath(decl.init.arguments[0].value, filePath);
    decl.init.arguments[0].value = moduleName;

    if (moduleName.endsWith('.json')) {
      handleJsonImport(j, modulePath, decl);

      return;
    }
    if (decl.id.type === 'Identifier') {
      handleDefaultImport(j, modulePath, decl, spreadModules);
    } else if (decl.id.type === 'ObjectPattern') {
      handleNamedImport(j, root, modulePath, decl, usedIdentifiers);
    }
  });

  if (firstComment) {
    root.get().node.program.body[0].comments = firstComment;
  }
}

module.exports = transformRequire;
