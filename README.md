# GAMS Engine UI
This repository contains the code for the management UI for [GAMS Engine](https://gams.com/engine). The UI is a React app for managing jobs, models, users and more. Feel free to extend the code and send us a pull request if you think others would benefit from your changes.

# Installing
To use the GAMS Engine UI, you must have [Node.js](https://nodejs.org) installed. Run `npm install` to install the packages required for the GAMS Engine UI. You must also convert the SCSS file to CSS by running `npm run build-css`.

# Starting
GAMS Engine UI must know which instance of [GAMS Engine](https://gams.com/engine) to connect to. You can specify the location of GAMS Engine using the environment variable: `REACT_APP_ENGINE_URL`. Then run `npm start` to start the interface. 

# Building
To create a set of static HTML/Javascript/CSS files for use in production, run `npm run build`. Once finished, the files are located in the `build` subdirectory. If you want to mount the Engine UI on a path other than `/` (e.g. `https://my-domain.com/engine`), set the environment variable `REACT_APP_BASE_NAME` accordingly. 

# License
[MIT](https://github.com/gams-dev/engine-ui/blob/master/LICENSE)
