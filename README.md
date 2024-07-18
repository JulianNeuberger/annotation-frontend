# Assisted Process Annotation Frontend Application

## Installation

Edit the .env file and point to the backend servers (see https://github.com/JulianNeuberger/assisted-process-annotation for more instructions)

To simply start the web app server run

```ssh
npm install
npm run dev
```

You can now access the frontend at http://127.0.0.1:5173

If you want to use it in a more persistent manner, run

```ssh
npm install
npm run build
```

and serve the director `dist/`, e.g., via nginx.

### Docker

We provide a Dockerfile that you can use to build a docker image, which is recommended, if you plan to serve this application on a server.

