# GAMS Engine UI

![GAMS Engine Logo](https://gams.com/engine/assets/images/logo-bg-dark.png)

This repository contains the code for the management UI for [GAMS Engine](https://gams.com/engine). The UI is a React app for managing jobs, models, users and more. Feel free to extend the code and send us a pull request if you think others would benefit from your changes.

# Installing

To use the GAMS Engine UI, you must have [Deno](https://deno.com) installed. Run `deno install` to install the packages required for the GAMS Engine UI.

# Starting

GAMS Engine UI must know which instance of [GAMS Engine](https://gams.com/engine) to connect to. You can specify the location of GAMS Engine using the environment variable: `VITE_ENGINE_URL`. Then run `deno task dev` to start the interface.

# Building

To create a set of static HTML/Javascript/CSS files for use in production, run `deno task build`. Once finished, the files are located in the `build` subdirectory. The build's asset paths are always relative, so the same output works regardless of which path it's mounted on.

Which GAMS Engine instance to connect to, and which path the UI is mounted on, are configured at runtime rather than at build time, via `build/env-config.js`. When using the bundled Docker image, this file is generated automatically at container startup from the `ENGINE_URL` and `BASE_URL` environment variables. If you're hosting the `build` output yourself without the Docker image, edit `env-config.js` directly after building, e.g.:

```js
window.__RUNTIME_CONFIG__ = {
  ENGINE_URL: 'https://my-domain.com/api',
  BASE_URL: '/engine',
};
```

# License

[MIT](https://github.com/gams-dev/engine-ui/blob/master/LICENSE)
