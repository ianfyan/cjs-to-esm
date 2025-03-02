const transformDirname = require('./transformDirname');
const transformExport = require('./transformExport');
const transformExportProperty = require('./transformExportProperty');
const transformRequire = require('./transformRequire');
const transformRequireExpression = require('./transformRequireExpression');

module.exports = {
  transformDirname,
  transformExport,
  transformExportProperty,
  transformRequire,
  transformRequireExpression
};
