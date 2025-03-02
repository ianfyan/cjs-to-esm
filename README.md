# cjs-to-esm

![npm](https://img.shields.io/npm/v/@ianfyan/cjs-to-esm?color=blue) 
![npm downloads](https://img.shields.io/npm/dt/@ianfyan/cjs-to-esm) 
![license](https://img.shields.io/github/license/ianfyan/cjs-to-esm)


Easily convert your **CommonJS (`require`, `module.exports`)** code into modern **ES Modules (`import`, `export`)** with this simple CLI tool powered by **jscodeshift**.

## ✨ Features
✅ Converts `module.exports` to `export default` or named exports.  
✅ Transforms `require()` statements into `import` statements.  
✅ Handles default exports, named exports, and JSON imports.  
✅ Resolves relative paths for modules correctly.  
✅ Converts `__dirname` and `__filename` to ES module-compatible syntax.  
✅ Supports both **single file** and **batch processing**  


## 📦 Installation
```sh
npm install @ianfyan/cjs-to-esm -g
```

## 🚀 Usage
```sh
cjs-to-esm path/to/file.js
```

For example, to transform all files in the `src/` directory:
```sh
cjs-to-esm src/
```


## 📖 Examples

### **🔹 Converting `module.exports` to `export default`**
#### ✅ Before (CommonJS)
```js
const a = 1;
const b = 2;
module.exports = { a, b };
```
#### 🔄 After (ES Modules)
```js
const a = 1;
const b = 2;
export { a, b };
```

### **🔹 Converting `require()` to `import`**
#### ✅ Before (CommonJS)
```js
const fs = require('fs');
const { Server } = require('socket.io');
```
#### 🔄 After (ES Modules)
```js
import fs from 'fs';
import socketIo from 'socket.io';

const { Server } = socketIo;
```

### **🔹 Handling `__dirname` and `__filename`**
#### ✅ Before (CommonJS)
```js
const path = require('path');
const myDirname = path.resolve(__dirname, '../src/template');
```
#### 🔄 After (ES Modules)
```js
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const myDirname = path.resolve(__dirname, '../src/template');
```

### **🔹 Converting JSON imports**
#### ✅ Before (CommonJS)
```js
const packageJson = require('../package.json');
```
#### 🔄 After (ES Modules)
```js
import packageJson from '../package.json' with { type: 'json' };
```


## 🛠 Development
Clone the repository:
```sh
git clone https://github.com/ianfyan/cjs-to-esm.git
cd cjs-to-esm
npm install
```

### 💚 Run conversion
To test all functions:
```sh
npm convert path/to/file.js
```

## 📄 License
MIT License - Free to use and modify.
