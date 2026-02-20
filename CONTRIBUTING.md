# Contributing to Deriverse Trading Analytics

We welcome contributions! Please review this guide before submitting a pull request.

## Development Environment Setup

1. **Fork and Clone** the repository.
2. **Install dependencies** using pnpm:
   ```bash
   pnpm install
   ```
3. **Environment Setup**: Copy `.env.example` to `.env.local` and add any necessary local connection strings (like your `NEXT_PUBLIC_SOLANA_RPC`).
4. **Run the local dev server**:
   ```bash
   pnpm dev
   ```

## Workflow

1. **Branching**: Create a feature branch off of `main` (e.g., `feature/awesome-new-chart`).
2. **Coding Standards**: 
   - Follow the existing TypeScript strict mode guidelines.
   - Run `pnpm lint` and `pnpm format` before submitting PRs.
3. **Components**: Use Tailwind CSS for styling and place reusable components in the `components/` directory.
4. **Services and State**: Core logic should reside in the `services/` directory, while React state management should utilize custom hooks wrapping `@tanstack/react-query` inside the `hooks/` directory.

## Submitting Pull Requests

- Provide a clear and descriptive PR title.
- Detail the purpose of your changes in the PR body.
- If your change affects the user interface, please include screenshots of the before/after states.

## Reporting Issues

If you find a bug or have a feature request, please open an Issue with steps to reproduce the bug or detailed reasoning for the feature.
