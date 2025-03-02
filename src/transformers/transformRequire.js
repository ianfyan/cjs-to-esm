const fs = require('fs');
const path = require('path');

const { toCamelCase } = require('node-string-utils');

/**
 * Transforms `require()` calls into ES module `import` statements.
 *
 * This function handles various cases:
 * - Handles relative module paths and resolves them correctly
 * - Ensures named imports are correctly transformed, avoiding naming conflicts
 * - Converts `const foo = require('foo');` → `import foo from 'foo';`
 * - Converts `const { foo, bar } = require('module');` → `import { foo, bar } from 'module';`
 * - Converts JSON imports like `require('./data.json')`
 *   to `import data from './data.json' assert { type: 'json' };`
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

  // Identify spread modules in module.exports
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

  root.find(j.VariableDeclaration)
    .forEach((modulePath) => {
      const decl = modulePath.value.declarations[0];
      if (
        decl.init
        && decl.init.type === 'CallExpression'
        && decl.init.callee.name === 'require'
      ) {
        let moduleName = decl.init.arguments[0].value;

        const baseDir = path.dirname(filePath);
        const absolutePath = path.resolve(baseDir, moduleName);

        // Handle imports from directories by appending /index.js only if path starts with ./ or ../
        if ((moduleName.startsWith('.') || moduleName.startsWith('..')) && !path.extname(moduleName)) {
          const possibleJsFile = `${absolutePath}.js`;
          const possibleJsonFile = `${absolutePath}.json`;
          const possibleIndexFile = path.join(absolutePath, 'index.js');

          if (fs.existsSync(possibleJsFile)) {
            moduleName += '.js';
          } else if (fs.existsSync(possibleJsonFile)) {
            moduleName += '.json';
          } else if (fs.existsSync(possibleIndexFile)) {
            moduleName += '/index.js';
          }
        }

        // Check if require() is for a JSON file
        if (moduleName.endsWith('.json')) {
          if (decl.id.type === 'Identifier') {
            // Convert `const packageJson = require('../package.json');`
            // To: `import packageJson from '../package.json' assert { type: 'json' };`
            const importDecl = j.template.statement([
              `import ${decl.id.name} from '${moduleName}' with { type: 'json' };`
            ]);
            j(modulePath).replaceWith(importDecl);
          }

          return; // Skip other transformations if JSON import is handled
        }

        if (decl.id.type === 'Identifier') {
          // Convert `const foo = require('foo');` → `import foo from 'foo';`
          const localName = decl.id.name;
          const needsTempVariable = modulePath.value.kind === 'let' || modulePath.value.kind === 'var';
          const importName = needsTempVariable ? `_${localName}` : localName;

          const importDecl = spreadModules.has(localName)
            ? j.importDeclaration(
              [j.importNamespaceSpecifier(j.identifier(importName))],
              j.literal(moduleName)
            )
            : j.importDeclaration(
              [j.importDefaultSpecifier(j.identifier(importName))],
              j.literal(moduleName)
            );

          // Jika `let` atau `var`, buat reassignable variable
          if (needsTempVariable) {
            const assignment = j.variableDeclaration(modulePath.value.kind, [
              j.variableDeclarator(j.identifier(localName), j.identifier(importName))
            ]);
            j(modulePath).replaceWith([importDecl, assignment]);
          } else {
            j(modulePath).replaceWith(importDecl);
          }
        } else if (decl.id.type === 'ObjectPattern') {
          // Convert destructuring require, e.g.:
          // const { foo, bar } = require('module-name');
          // to:
          // import moduleName from 'module-name';
          // const { foo, bar } = moduleName;
          let baseName = path.basename(moduleName, '.js');

          if (baseName === 'index') {
            baseName = path.basename(absolutePath);
          }

          let identifierName = toCamelCase(baseName);

          if (usedIdentifiers.has(identifierName) && moduleName.startsWith('@')) {
            const [scope, pkg] = moduleName.split('/');
            identifierName = toCamelCase(`${scope.replace('@', '')}_${pkg}`);
          }

          // Handle conflicted variable import with property
          const hasConflict = decl.id.properties.some(
            (prop) => prop.key.name === identifierName
          );

          if (hasConflict) {
            identifierName = `_${identifierName}`;
          }

          usedIdentifiers.set(identifierName, moduleName);

          const moduleIdentifier = j.identifier(identifierName);
          const importDecl = j.importDeclaration(
            [j.importDefaultSpecifier(moduleIdentifier)],
            j.literal(moduleName)
          );

          // Prepend the new import declaration at the top of the file
          root.get().node.program.body.unshift(importDecl);
          modulePath.replace(
            j.variableDeclaration(modulePath.value.kind, [
              j.variableDeclarator(decl.id, moduleIdentifier)
            ])
          );
        }
      }
    });

  if (firstComment) {
    root.get().node.program.body[0].comments = firstComment;
  }
}

module.exports = transformRequire;
