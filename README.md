# Imgur Direct Link Grabber v2

Fork of https://github.com/jlplenio/imgur-direct-links-grabber that doesn't rely on imgur api keys as they are no longer giving them out. Also adds in support for docker containers to run locally in a containerized setup.

The Imgur Direct Link Grabber is a web application designed to extract direct image links from any given Imgur gallery URL. It's built using modern web technologies and provides a simple and intuitive user interface that ensures ease of use.

## Features

- **Gallery URL Input**: Users can enter an Imgur gallery URL into the input field to retrieve direct links to images.
- **Image Links Display**: The direct links to the images are displayed in a read-only textarea, allowing for easy review.
- **Copy to Clipboard**: Users can copy the displayed image links to their clipboard.
- **Shuffle and Tag**: Users can shuffle image links and add tags.

## Dependencies

- React
- Tailwind CSS
- Radix UI for icons
- Custom API and utilities for handling Imgur URLs

## Local Development

1. Install [Bun](https://bun.sh/) (v1.0 or newer).
2. Copy `.env.example` to `.env` and set `NEXT_PUBLIC_SITE_URL` (and any other required values).
3. Install dependencies with `bun install`.
4. Start the dev server via `bun run dev` and open http://localhost:3000.

## Run Locally with Docker Compose

1. Make sure Docker and Docker Compose are installed on your machine.
2. Copy `.env.example` to `.env` and set `NEXT_PUBLIC_SITE_URL` (and any other required values).
3. Build and start the stack with `docker compose up --build`.
4. Access the app at http://localhost:4000 once the container passes its health check.

**Disclaimer:** This tool is not affiliated with or endorsed by Imgur and is intended for personal use. Please use responsibly and adhere to Imgur's Terms of Service.
