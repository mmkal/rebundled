# rebundled
A tool which rebundles other people's npm packages so more people can use them

## What?

This package automates the steps required to take an npm package associated with a GitHub repo, and publish it under the `@rebundled/` npm organization, with some tweaks to the `package.json` file and/or the build process.

## Why?

Originally, this project started as a workaround for some open source libraries, which dropped CommonJS/`require` support and switched their outputs to pure ESM - see [this gist](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) for an explainer. Now, it's also used to publish versions of packages based on forks of OSS projects which take a while to get attention.

However, in lots of real world projects, switching over to ESM is messy, and sometimes not possible. Tools can conflict with each other, and updating thousands of imports to work the right way, for modern ESM-only libraries _and_ legacy require-only libraries - which may include making some imports async, in synchronous contexts, adding file extensions to relative imports and various createRequire tricks, and then configuring tsc, eslint, swc, ts-node, ts-jest to work across all of them - simply isn't practical. Developers want to be able to install packages and have them "just work". On the other hand, some maintainers are unwilling to support multiple import styles.

Luckily, microbundle exists. So, what this repo does is take an existing package, make some small adjustments to its package.json, run `microbundle`, on it, and publish it as a separate package under the `@rebundled/` npm organization.

## What about patch-package?

patch-package is great, but has some limitations. First, the work needs to be done by the end user. With rebundled, the alterations are done once and the rebundled package can be installed by any number of people without having to worry about what to patch and how. Second, patch-package is only really designed for hard-coded changes to code. `rebundled` allows modify the whole build step, in a repeatable way.

## How are packages versioned?

This repo installs the rebundled packages as regular dependencies, and will rely on renovate to regularly updade them. There's a CLI which allows passing in a `--version`, or setting it to `--bump` the existing version. There's also a `--prerelease` CLI arg allowing publishing with the specified tag.

Eventually, a github action running against the main branch will automatically publish equivalent versions of the originals within a few days of them being published. _Note: at time of writing this GitHub action isn't set up yet_

## What next?

Right now `rebundled` isn't written to be used outside of this repo. But eventually, it could be. With some additional configurability it could allow rebundling other dependencies than the handful that are hardcoded here now.

## What are the downsides? 

- Maybe: the [dual package hazard](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c?permalink_comment_id=3850849#gistcomment-3850849).
- Splintering the OSS community. It's confusing to have alternate versions of packages. However I think this method is _less_ harmful than using manually-maintained forks. In some cases
