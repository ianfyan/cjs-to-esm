# JavaScript Code Transformer

## Overview
This project provides a **JavaScript Code Transformer** that automatically converts CommonJS (`require` and `module.exports`) into ES Modules (`import` and `export`). The transformation is powered by **jscodeshift**.

## Folder Structure
```
/project-root
  ├── src
  │   ├── index.js                  # Main transformation logic
  │   ├── cli
  │   │   ├── index.js              # CLI script to run the transformation
  │   └── transformers
  │       ├── helpers.js            # Helper functions
  │       ├── index.js              # index folder
  │       ├── transformDirname.js   # Handles __dirname transformation
  │       ├── transformExports.js   # Handles module.exports → export transformation
  │       ├── transformRequire.js   # Handles require() → import transformation
  ├── package.json
  ├── README.md
```

## Installation
Ensure you have **Node.js** installed, then install dependencies:
```bash
npm install
```

## Usage
Run the transformation script with the following command:
```bash
npm run convert -- path/to/file.js
```
For example, to transform all files in the `src/` directory:
```bash
npm run convert -- src/
```

## Features
- Converts:
  ```js
  const foo = require('foo');
  ```
  to
  ```js
  import foo from 'foo';
  ```

- Converts:
  ```js
  const { foo } = require('bar');
  ```
  to
  ```js
  import bar from 'bar';
  const { foo } = bar;
  ```

- Converts:
  ```js
  module.exports = { foo, bar };
  ```
  to
  ```js
  export { foo, bar };
  ```

- Converts:
  ```js
  module.exports = someFunction;
  ```
  to
  ```js
  export default someFunction;
  ```

- Converts object literals with properties containing values directly to `export default`, for example:
  ```js
  module.exports = {
    foo: 'value',
    bar: 42
  };
  ```
  to
  ```js
  export default {
    foo: 'value',
    bar: 42
  };
  ```

- Converts `__dirname` and `__filename` from CommonJS to ES module compatible syntax:
  ```js
  const path = require('path');

  const myDirname = path.resolve(__dirname, '../src/template');
  console.log(myDirname);
  ```
  to
  ```js
  import path from 'path';
  import { fileURLToPath } from 'url';

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const myDirname = path.resolve(__dirname, '../src/template');
  console.log(myDirname);
  ```

- Converts `package.json` imports with `assert` to ES module syntax:
  ```js
  const packageJson = require('../package.json');
  ```
  to
  ```js
  import packageJson from '../package.json' assert { type: 'json' };
  ```

- Supports both **single file** and **batch processing**



## Requirements
- Node.js 14+
- jscodeshift
