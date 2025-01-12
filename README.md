# Code Migration Tool

This is a code migration application designed to help developers modernize their legacy (old rusty bad) code without compromising existing business logic or security. It leverages the power of AI to detect and replace outdated or deprecated code with more current standards. Under the hood, the project uses a Next.js frontend, a Nest.js backend, and Nx for easy monorepo management.

## Features

- Monorepo setup via Nx (makes it a really easy to manage both client and server).
- GitHub OAuth integration: pulls repositories, inspects files, and caches data with Redis.
- PostgreSQL as the primary database for secure and reliable data storage.

### AI Code Transformation Options:

- **Claude**: Highly recommended for its advanced capabilities and versatility.
- **OpenAI**: Recommended for reliable performance and wide adoption.
- **DeepSeek**: A highly cost-effective option with impressive quality, making it an excellent choice for budget-conscious users.
- **Gemini**: An acceptable option with decent performance but may not be as competitive as others.
- **Locally Hosted LLMs**: Ideal for users with powerful hardware. For instance, running the **DeepSeek v3 (34B model)** locally via LM Studio can deliver exceptional results, potentially outperforming Claude in certain scenarios.

## Setup

1. Clone the repo:
   ```
   git clone https://github.com/qeqqe/Code-Migration-Tool.git
   ```
2. Install dependencies:

   ```
   pnpm install
   ```

   (or `npm install`, or `yarn install`—whichever you prefer)

3. Make a copy of the example environment file:

   ```
   cp apps/server/.env.example apps/server/.env
   ```

   Then fill in the required values, such as your GitHub Client ID/Secret.

4. Start Redis:

   ```
   pnpm CreateRedis
   pnpm redis
   ```

   Confirm Redis is running with:

   ```
   docker ps
   ```

   Stop with:

   ```
   docker stop redis
   ```

5. Run the server (Nest.js backend):
   ```
   pnpm exec nx run server:serve --configuration=development
   ```
6. Run the frontend (Next.js):
   ```
   pnpm exec nx run client:dev
   ```

## How It Works

- Users can either log in locally (not yet fully supported) or via GitHub OAuth.
- Upon GitHub login, the tool fetches your repos, shows files, and can use AI to apply modern code transformations.
- By caching repo data in Redis, we reduce API calls to GitHub and improve responsiveness.

## Local File Upload

We now support uploading your local files (up to 80MB). Any files under node_modules will be automatically ignored. The tool references your .gitignore to skip unneeded folders.

## Screenshots

### Welcome Page

![Screenshot 2025-01-11 202814](https://github.com/user-attachments/assets/4a7394b5-d768-4799-b17f-769f0c9a8192)

### Dashboard

![Screenshot 2025-01-11 203052](https://github.com/user-attachments/assets/43db599d-f10b-4bcb-9e0b-4018fc6b2ef8)

### Editor interface (So far)

![Screenshot 2025-01-11 195455](https://github.com/user-attachments/assets/24fb6ea9-f125-4660-a603-662461e354e3)

## Progress So Far

- GitHub OAuth integrated for easy repository listing and file retrieval.
- AI transformation set up to modernize outdated code while preserving logic and security.
- Redis caching for quick repo/file lookups, reducing repeated GitHub API calls.
- PostgreSQL database connected for user and repository data storage.

## Upcoming Features

- Deeper AI model support (Claude, OpenAI, Gemini, local LLMs, etc.) to handle various migration needs.
- Enhanced local login flows for non-GitHub users.
- Additional code migration strategies to support more specialized frameworks.
- Detailed analytics on migration outcomes to help developers track improvements.

## Roadmap

- Fully support local (non-GitHub) logins.
- Expand AI model integrations.
- Add additional code transformation logic for specific frameworks or languages.
- Enhance security controls and authentication features.

## Contributing

**You're most welcomed to contribute!**

1. Fork the repo.
2. Create a new branch.
3. Commit and push changes.
4. Open a pull request.

We hope this tool makes your migration efforts simpler while maintaining reliability and security. Enjoy the modernized workflow, and feel free to share your feedback or contribute to the project!
