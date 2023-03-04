# rebundled
A tool which rebundles other people's npm packages so more people can use them

## What?

Many open source libraries are dropping `require` support and switching their outputs to pure ESM - see [this gist](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) for an explainer.

However, in lots of real world projects, switching over to ESM is messy, and sometimes not possible. Tools can conflict with each other, and updating thousands of imports to work the right way, for modern ESM-only libraries _and_ legacy require-only libraries - which may include making some imports async, in synchronous contexts, adding file extensions to relative imports and various createRequire tricks, and then configuring tsc, eslint, swc, ts-node, ts-jest to work across all of them - simply isn't practical. Developers want to be able to install packages and have them "just work". On the other hand, some maintainers are unwilling to support multiple import styles.

Luckily, microbundle exists. So, what this repo does is take an existing package, make some small adjustments to its package.json, run `microbundle`, on it, and publish it as a separate package under the `@rebundled/` npm organization 
