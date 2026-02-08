# Contributing to VChat V2

Thank you for your interest in contributing to VChat V2! We welcome contributions from the community.

## Development Workflow

### 1. Setup Your Development Environment

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/VChat-V2.git
cd VChat-V2

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Fill in your Firebase credentials in .env.local

# Start development server
npm run dev
```

### 2. Create a Feature Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 3. Make Your Changes

- Write clean, readable code
- Follow the existing code style
- Add comments for complex logic
- Keep commits atomic and focused

### 4. Test Your Changes

- Manually test your changes thoroughly
- Ensure the app builds without errors: `npm run build`
- Check for linting issues: `npm run lint`

### 5. Commit Your Changes

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git add .
git commit -m "feat: add user profile editing"
# or
git commit -m "fix: resolve message duplication issue"
```

**Commit Types:**

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code formatting (no logic changes)
- `refactor:` Code restructuring
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub with:

- Clear title and description
- Reference any related issues
- Screenshots/GIFs for UI changes
- List of changes made

## Code Style Guidelines

### TypeScript

- Use TypeScript for all new files
- Define interfaces for all data structures
- Avoid `any` type - use proper typing
- Use functional components with hooks

### React

- Use functional components over class components
- Extract reusable logic into custom hooks
- Keep components focused and single-purpose
- Use React Context for global state

### Styling

- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Use custom CSS only when necessary
- Maintain consistency with design system

### File Organization

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   └── features/        # Feature-specific components
├── hooks/               # Custom hooks
├── context/             # React Context providers
├── lib/                 # Utilities and helpers
└── types/               # TypeScript type definitions
```

## Pull Request Checklist

Before submitting your PR, ensure:

- [ ] Code follows the project's style guidelines
- [ ] All linting checks pass (`npm run lint`)
- [ ] Build succeeds without errors (`npm run build`)
- [ ] No console errors or warnings
- [ ] Commits follow conventional commit format
- [ ] PR description clearly explains the changes
- [ ] Related issues are referenced

## Need Help?

- Check existing issues and pull requests
- Review [docs/SPEC.md](docs/SPEC.md) for architecture details
- Review [docs/phase plans/](docs/phase%20plans/) for implementation guides
- Open a discussion or issue for questions

## Code Review Process

1. Maintainers will review your PR within 3-5 days
2. Address any requested changes
3. Once approved, your PR will be merged
4. Your contribution will be credited in release notes

## Recognition

All contributors will be recognized in:

- Project README
- Release notes
- GitHub contributors page

Thank you for making VChat V2 better!
