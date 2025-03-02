const {
  transformDirname,
  transformExport,
  transformExportProperty,
  transformRequire,
  transformRequireExpression
} = require('./transformers');

/**
 * Transforms a CommonJS (CJS) file into an ECMAScript Module (ESM).
 *
 * @param {Object} fileInfo - The file information object provided by jscodeshift.
 * @param {Object} api - The jscodeshift API to manipulate the AST.
 * @returns {string|null} The transformed source code as a string, or `null`.
 */
function transformFile(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  let isCJS = false;

  // Check if file is using CommonJS (CJS)
  root.find(j.CallExpression, { callee: { name: 'require' } }).forEach(() => {
    isCJS = true;
  });

  root.find(j.MemberExpression, { object: { name: 'module' }, property: { name: 'exports' } }).forEach(() => {
    isCJS = true;
  });

  root.find(j.Identifier, { name: 'exports' }).forEach(() => {
    isCJS = true;
  });

  if (!isCJS) {
    return null;
  }

  // Apply the require transformation
  transformRequire(fileInfo, root, j);

  // Apply the require transformation
  transformRequireExpression(root, j);

  // Apply the exports transformation
  transformExport(root, j);

  // Apply the exports property transformation
  transformExportProperty(root, j);

  // Apply the __dirname transformation
  transformDirname(root, j);

  return root.toSource({ quote: 'single' });
}

module.exports = transformFile;
