# Agentic Wallet API

This service gives the GitHub Pages mint page a short-lived, per-user Binance Agentic Wallet session. It runs the official `baw` CLI inside an isolated profile for each browser session.

## Deploy on Render

1. Push this project to GitHub.
2. In Render, create a new Blueprint from the repository. It detects `render.yaml`.
3. Set `ALLOWED_ORIGIN` to the exact GitHub Pages origin, for example `https://your-account.github.io`.
4. Set `ALLOWED_TO` to the mint contract and USDT contract that this site is allowed to request. Do not use a wildcard.
5. Copy the deployed service URL. The page will use `https://YOUR-SERVICE.onrender.com/api/agent-wallet`.

The service does not expose a general transaction relay: only contracts in `ALLOWED_TO` are accepted. Binance Wallet still presents the QR login and every transaction confirmation to the user in the Binance App.

## Required page setting

Set the `agent-wallet-api` meta tag in `index.html` to the deployed Render URL before publishing the GitHub Pages site.
