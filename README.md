# Mars

Mars is a fan-made strategy board game web application inspired by Terraforming Mars, built with React and TypeScript.

## Demo

[Live Demo](https://mars-azure-beta.vercel.app/)

## Features

- Turn-based resource management
- Player resource tracking
- Terraform Rating tracking
- Undo / redo support
- Local development API server
- Responsive web UI

## Tech Stack

- React
- TypeScript
- React Router
- Create React App

## Getting Started

Install dependencies:

```bash
npm install
```

Start the local API server:

```bash
npm run api
```

Start the app:

```bash
npm start
```

Open http://localhost:3000 in your browser.

## Environment Variables

The frontend reads `REACT_APP_API_URL` if set. If it is not set, the app talks to the local API server.

Example:

```bash
REACT_APP_API_URL=http://localhost:4000
```

## Project Goal

This project explores modern React architecture for turn-based strategy games and aims to provide a clean, maintainable, and reusable codebase for learning and experimentation.

## Roadmap

- Improve UI/UX
- Add multiplayer support
- Add save/load improvements
- Refactor game logic into reusable modules
- Add tests

## Contributing

Issues and pull requests are welcome.

## Disclaimer

This project is an unofficial fan-made application for educational and non-commercial purposes.

## License

MIT
