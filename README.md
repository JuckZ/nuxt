# Nuxt 3 Minimal Starter

Look at the [Nuxt 3 documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## TODO

1. README.md
2. Dialogue mode support

## Setup

Make sure to install the dependencies:

```bash
# yarn
yarn install

# npm
npm install

# pnpm
pnpm install
```

## Development Server

Start the development server on <http://localhost:3000>

```bash
npm run dev
```

## Production

Build the application for production:

```bash
npm run build
```

Locally preview production build:

```bash
npm run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Compile ntfy

```powershell
cd server/util/ntfy
$env:GOOS = "js"
$env:GOARCH = "wasm"
go build -o public/ntfy.wasm server/util/ntfy/ntfy.go
```
