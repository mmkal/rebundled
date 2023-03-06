# rebundled
A tool which rebundles other people's npm packages so more people can use them

## What?

Many open source libraries are dropping `require` support and switching their outputs to pure ESM - see [this gist](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) for an explainer.

However, in lots of real world projects, switching over to ESM is messy, and sometimes not possible. Tools can conflict with each other, and updating thousands of imports to work the right way, for modern ESM-only libraries _and_ legacy require-only libraries - which may include making some imports async, in synchronous contexts, adding file extensions to relative imports and various createRequire tricks, and then configuring tsc, eslint, swc, ts-node, ts-jest to work across all of them - simply isn't practical. Developers want to be able to install packages and have them "just work". On the other hand, some maintainers are unwilling to support multiple import styles.

Luckily, microbundle exists. So, what this repo does is take an existing package, make some small adjustments to its package.json, run `microbundle`, on it, and publish it as a separate package under the `@rebundled/` npm organization.

## What about patch-package?

patch-package is great, but has some limitations. First, the work needs to be done by the end user. With rebundled, the alterations are done once and the rebundled package can be installed by any number of people without having to worry about what to patch and how. Second, patch-package is only really designed for minor tweaks. microbundle is a build step rather than a small edit of a single line of code.

## How are packages versioned?

This repo installs the rebundled packages as regular dependencies, and will rely on renovate to regularly updade them. A github action running against the main branch will automatically publish equivalent versions of the originals within a few days of them being published. _Note: at time of writing this GitHub action isn't set up yet_

## What are the downsides? 

- Maybe: the [dual package hazard](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c?permalink_comment_id=3850849#gistcomment-3850849).
